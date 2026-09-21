

/**
 * @module tools/fix
 *
 * pix_fix MCP tool - File tree validation and auto-fix.
 * Scans a project's file tree, detects violations of the rule AI
 * barrel file convention, and optionally auto-fixes them.
 *
 * Two modes:
 *   lint  - scan and report issues without modifying anything
 *   fix   - scan and auto-fix (create barrels, rename files)
 *
 * @see module:core/file-tree - Core validation logic
 * @see module:cli/commands - CLI fix command handler
 */

import { z } from "zod/v4";
import { registerTool } from "../router/index.js";
import { fixMode } from "./_auto-fix.js";
import { generateMode } from "./_generate.js";
import { lintMode } from "./_lint.js";

const FixSchema = z.object({
  path: z.string().optional().default(".").describe("Project root directory to scan"),
  srcDir: z.string().optional().default("src").describe("Source directory (default: src)"),
  mode: z.enum(["lint", "fix", "generate"]).default("lint").describe("lint: scan and report issues. fix: scan and auto-fix. generate: generate component file tree."),
  name: z.string().optional().describe("Component name (PascalCase) for mode=generate"),
  framework: z.string().optional().default("vanilla").describe("Framework for mode=generate"),
  baseDir: z.string().optional().default("src/components").describe("Base output directory for mode=generate"),
  dryRun: z.boolean().optional().default(true).describe("Preview fixes without applying (default: true). Set false to apply."),
});

/**
 * Register the pix_fix tool.
 * Called during skill loading in loadAllSkills().
 */
export function registerFixTool() {
  registerTool({
    name: "rule_tool_fix",
    entry: "action",
    description: "Validate and auto-fix project file tree structure against rule AI conventions (barrel files, _PascalCase naming, etc.).",
    zodSchema: FixSchema,
    handler: async (arguments_) => {
      const mode = arguments_.mode || "lint";

      if (mode === "generate") {
        return generateMode(arguments_);
      }

      if (mode === "lint") {
        return lintMode(arguments_);
      }

      if (mode === "fix") {
        return fixMode(arguments_);
      }

      return { isError: true, content: [{ type: "text", text: `Unknown mode: ${mode}` }] };
    },
  });
}
