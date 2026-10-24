/**
 * @module tools/plan
 *
 * The persona operation tools: `rule_tool_plan`, `rule_tool_audit` and
 * `rule_tool_review` (personas plan B.1).
 *
 * One composable entry point (`rule_tool_plan`, with an `operation`) plus one
 * tool per operation, so a custom IDE that lists tools instead of slash
 * commands can reach `/rule-persona-*-audit` and `/rule-persona-*-review` without knowing the
 * `operation` parameter. The per-role prompts and agent commands are
 * conveniences generated from the same registry, so whatever these tools
 * answer, they answer too.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod/v4";

import { allRoles, roleById } from "../../core/review/roles/index.js";
import { loadRoleOverlays } from "../../core/review/_overlays.js";
import { fillRoleTemplate, OPERATIONS } from "../../core/review/template/index.js";
import { graphHealth } from "../../core/tokensave/_graph.js";
import { fenceUntrusted } from "../../core/enforcement/index.js";
import { registerTool } from "../router/index.js";

/**
 * Resolve a role by exact id first, then by any name it answers to (title,
 * alias). The registry keeps old ids alive as aliases - e.g. `api-design` is
 * what `backend` is an alias of - so the tool should answer to them, same
 * as {@link module:core/review/roles.detectRole} does for free-form prompts.
 */
function resolveRole(requested, overlays) {
  const exact = roleById(requested, overlays);

  if (exact) {
    return exact;
  }

  const normalized = String(requested).toLowerCase();

  return allRoles(overlays).find((role) =>
    [role.id, role.id.replaceAll("-", " "), role.role.toLowerCase(), ...(role.aliases ?? [])].some((name) => String(name).toLowerCase() === normalized),
  );
}

/** The arguments every persona operation tool shares. */
const baseShape = {
  role: z.string().describe("Role id (security, privacy, a11y...)"),
  years: z.number().int().positive().optional(),
  skills: z.array(z.string()).optional(),
  topic: z.string().optional().describe("Free-text request; becomes the binding scope of the run. Default: the whole project."),
  projectDir: z.string().optional(),
};

const PlanSchema = z.object({
  ...baseShape,
  operation: z.enum(OPERATIONS).optional().describe("Which document this run produces: plan, audit, or review (default: all three)"),
});

const OperationSchema = z.object(baseShape);

/**
 * The handler both entry points share. `pinned` forces one operation, which is
 * what makes `rule_tool_audit` a tool rather than an alias.
 */
const planHandler = (pinned) => async (arguments_) => {
  const operation = pinned ?? arguments_.operation ?? "all";
  const { roles: overlays, problems } = loadRoleOverlays({ projectDir: arguments_.projectDir });
  const role = resolveRole(arguments_.role, overlays);

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
    operation,
    // The generator is deterministic: it checks for .tokensave/ here so a
    // scoped prompt can state availability instead of asking the run to probe.
    tokensave: existsSync(join(arguments_.projectDir ?? ".", ".tokensave")) ? "available" : undefined,
  });
  const graph = graphHealth(arguments_.projectDir ?? ".");
  const withGraph = graph ? [filled, "", graph].join("\n") : filled;
  // An overlay role is repository- or user-supplied text on its way to a
  // model: it is data, and it says so (hardening 4.4).
  const body = role.layer ? fenceUntrusted(withGraph, { label: `${role.layer} overlay role "${role.id}"` }) : withGraph;
  const notes = problems.map((problem) => `- ${problem.file}: ${problem.reason}`);

  return {
    content: [
      {
        type: "text",
        text: [body, ...(notes.length > 0 ? ["", "## Overlay files skipped", "", ...notes] : [])].join("\n"),
      },
    ],
  };
};

/** Register the persona operation tools. */
export function registerPlanTool() {
  registerTool({
    name: "rule_tool_plan",
    entry: "action",
    description: "Ask an expert review persona to audit, review or plan this project; returns the operation contract.",
    zodSchema: PlanSchema,
    advertise: ["role", "topic", "operation"],
    handler: planHandler(null),
  });

  registerTool({
    name: "rule_tool_audit",
    entry: "action",
    description: "Run an audit as an expert review persona; returns the audit operation contract.",
    zodSchema: OperationSchema,
    advertise: ["role", "topic"],
    handler: planHandler("audit"),
  });

  registerTool({
    name: "rule_tool_review",
    entry: "action",
    description: "Run a review as an expert review persona; returns the review operation contract.",
    zodSchema: OperationSchema,
    advertise: ["role", "topic"],
    handler: planHandler("review"),
  });
}
