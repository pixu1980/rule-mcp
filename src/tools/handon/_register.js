

/** Register the rule_tool_handon MCP tool. */
import { z } from "zod/v4";
import { registerTool } from "../router/index.js";
import { handon } from "./_handon.js";

const HandonSchema = z.object({
  projectDir: z.string().optional().default(".").describe("Project root directory"),
  file: z.string().optional().describe("A specific handoff to read instead of the newest"),
  list: z.boolean().optional().default(false).describe("List the handoffs and verify nothing"),
  closeout: z.boolean().optional().default(true).describe("Archive completed audits/reviews/plans into ADRs before verifying (default on; false = verify only, nothing written)"),
});

/** Register the rule_tool_handon tool. */
export function registerHandonTool() {
  registerTool({
    name: "rule_tool_handon",
    entry: "action",
    description:
      "Read the last handoff in docs/handoff/ and report which of its claims are still true: branch, commit range, files, ADRs, open work. Sweeps completed audits/reviews/plans into ADRs first, then proposes the next workstream each open plan still carries, for the user to confirm. Never re-runs a claimed command.",
    zodSchema: HandonSchema,
    handler: async (arguments_) => ({
      content: [{ type: "text", text: handon(arguments_ ?? {}).text }],
    }),
  });
}
