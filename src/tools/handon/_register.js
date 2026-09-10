

/** Register the rule_tool_process_handon MCP tool. */
import { z } from "zod/v4";
import { registerTool } from "../router/index.js";
import { handon } from "./_handon.js";

const HandonSchema = z.object({
  projectDir: z.string().optional().default(".").describe("Project root directory"),
  file: z.string().optional().describe("A specific handoff to read instead of the newest"),
  list: z.boolean().optional().default(false).describe("List the handoffs and verify nothing"),
});

/** Register the rule_tool_process_handon tool. */
export function registerProcessHandonTool() {
  registerTool({
    name: "rule_tool_process_handon",
    description:
      "Read the last handoff in docs/handoff/ and report which of its claims are still true: branch, commit range, files, ADRs, open work. Read-only, never re-runs a claimed command.",
    zodSchema: HandonSchema,
    annotations: { readOnlyHint: true },
    handler: async (arguments_) => ({
      content: [{ type: "text", text: handon(arguments_ ?? {}).text }],
    }),
  });
}
