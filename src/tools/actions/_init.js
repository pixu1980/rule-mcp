

/**
 * @module tools/actions/init
 *
 * `rule_tool_init`: prepare a project for rule-mcp (central recorder dir
 * and optional tokensave). Same work as `rule-mcp init` / `/rule-init`.
 *
 * @see module:cli/init
 */

import { z } from "zod/v4";
import { initProject, renderInit } from "../../cli/_init.js";
import { registerTool } from "../router/index.js";

/** Register the rule_tool_init tool. */
export function registerInitTool() {
  registerTool({
    name: "rule_tool_init",
    entry: "action",
    description:
      "Prepare a project for rule-mcp: create the central recorder directory under the state dir, " +
      "migrate a leftover local .rule-mcp if present, and run tokensave init when installed. " +
      "Nothing is written into the repository. Pass noTokensave: true to skip tokensave.",
    zodSchema: z.object({
      projectDir: z.string().optional().describe("Project root (default: cwd)"),
      noTokensave: z.boolean().optional().default(false).describe("Skip tokensave init"),
    }),
    handler: async (arguments_) => {
      const result = initProject({
        projectDir: arguments_.projectDir,
        tokensave: arguments_.noTokensave ? false : undefined,
      });

      return {
        content: [{ type: "text", text: `# rule_tool_init\n\n${renderInit(result)}` }],
      };
    },
  });
}
