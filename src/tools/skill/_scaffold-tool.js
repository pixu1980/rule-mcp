

/** @module tools/skill/scaffold-tool */

import { z } from "zod/v4";
import { registerTool, readSkill } from "../router/index.js";
import { extractScaffoldSection, extractSingleScaffoldFile } from "../../core/scaffold/_parser.js";

/**
 * Register the pix_scaffold tool for project scaffolding.
 */
export function registerScaffoldTool() {
  const SCAFFOLD_FILES = [
    { name: ".prettierrc", description: "Prettier formatter config (printWidth=120, tabWidth=2)" },
    { name: ".nvmrc", description: "Node version manager config (lts/*)" },
    { name: ".npmrc", description: "Package manager config (save-exact=true, so `pnpm add` writes an exact version)" },
    { name: ".editorconfig", description: "EditorConfig for cross-IDE consistency" },
    { name: ".gitignore", description: "Git ignore rules (OS + Node + build)" },
    { name: "eslint.config.mjs", description: "ESLint flat config (@eslint/js + eslint-plugin-unicorn, ESLint 10)" },
    { name: "tsconfig.json", description: "TypeScript config (strict, ESNext)" },
    { name: "jsconfig.json", description: "JS config (checkJs, strict)" },
  ];
  const ScaffoldSchema = z.object({
    mode: z.enum(["generate", "list", "validate"]).default("generate").describe("Scaffold operation mode"),
    file: z.string().optional().describe("Specific file to generate (omit for all)"),
    projectDir: z.string().optional().describe("Project root path (for validate mode)"),
    framework: z.string().optional().describe("Framework hint (tsconfig only for TS projects)"),
  });
  registerTool({
    name: "rule_tool_scaffold",
    entry: "action",
    description: "Generate project scaffolding files. Returns one or all config file templates.",
    zodSchema: ScaffoldSchema,
    handler: async (arguments_) => {
      const mode = arguments_.mode || "generate";

      if (mode === "list") {
        const list = SCAFFOLD_FILES.map((f) => "- `" + f.name + "`: " + f.description).join("\n");

        return {
          content: [
            {
              type: "text",
              text: "# Scaffold Files\n\n" + list + "\n\nUse `pix_scaffold mode=generate` to create all files, or `pix_scaffold mode=generate file=.prettierrc` for one.",
            },
          ],
        };
      }

      if (mode === "validate") {
        const { existsSync } = await import("node:fs");
        const { join } = await import("node:path");
        const dir = arguments_.projectDir || ".";
        const results = [];

        for (const f of SCAFFOLD_FILES) {
          const path = join(dir, f.name);
          const exists = existsSync(path);
          results.push("- " + (exists ? "✅" : "❌") + " `" + f.name + "`: " + (exists ? "found" : "missing"));
        }

        return { content: [{ type: "text", text: "# Scaffold Validation: " + dir + "\n\n" + results.join("\n") }] };
      }
      // mode === "generate"
      const content = readSkill("rule-styleguide");

      if (!content) {
        return { isError: true, content: [{ type: "text", text: "rule-styleguide skill not found." }] };
      }

      const scaffoldSection = extractScaffoldSection(content);

      if (arguments_.file) {
        return extractSingleScaffoldFile(scaffoldSection, arguments_.file);
      }

      return { content: [{ type: "text", text: "# Project Scaffolding\n\n" + scaffoldSection }] };
    },
  });
}
