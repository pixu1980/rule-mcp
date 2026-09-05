/**
 * @module tools/plan
 *
 * `rule_tool_plan` - ask an expert persona to audit this project and plan the
 * work (personas plan B.1).
 *
 * This is the composable entry point: a role id plus optional refinements.
 * The per-role prompts and agent commands are conveniences generated from the
 * same registry, so whatever this tool answers, they answer too.
 */

import { z } from "zod/v4";

import { allRoles, roleById } from "../core/review-roles.js";
import { loadRoleOverlays } from "../core/review-roles-overlays.js";
import { fillRoleTemplate } from "../core/review-roles-template.js";
import { fenceUntrusted } from "../core/untrusted.js";
import { registerTool } from "./router.js";

const PlanSchema = z.object({
  role: z.string().describe("Role id (security, privacy, a11y...)"),
  years: z.number().int().positive().optional(),
  skills: z.array(z.string()).optional(),
  topic: z.string().optional(),
  projectDir: z.string().optional(),
});

/** Register the rule_tool_plan tool. */
export function registerPlanTool() {
  registerTool({
    name: "rule_tool_plan",
    description:
      "Ask an expert review persona to audit this project and plan the work; returns the operation contract.",
    zodSchema: PlanSchema,
    advertise: ["role", "topic"],
    handler: async (arguments_) => {
      const { roles: overlays, problems } = loadRoleOverlays({ projectDir: arguments_.projectDir });
      const role = roleById(arguments_.role, overlays);

      if (!role) {
        const known = allRoles(overlays)
          .map((entry) => `${entry.id} (${entry.status})`)
          .join(", ");

        return {
          isError: true,
          content: [{ type: "text", text: `Unknown role "${arguments_.role}". Available: ${known}.` }],
        };
      }

      const filled = fillRoleTemplate(role, {
        years: arguments_.years,
        skills: arguments_.skills,
        topic: arguments_.topic,
      });
      // An overlay role is repository- or user-supplied text on its way to a
      // model: it is data, and it says so (hardening 4.4).
      const body = role.layer ? fenceUntrusted(filled, { label: `${role.layer} overlay role "${role.id}"` }) : filled;
      const notes = problems.map((problem) => `- ${problem.file}: ${problem.reason}`);

      return {
        content: [
          {
            type: "text",
            text: [body, ...(notes.length > 0 ? ["", "## Overlay files skipped", "", ...notes] : [])].join("\n"),
          },
        ],
      };
    },
  });
}
