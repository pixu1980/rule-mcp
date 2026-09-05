import { z } from "zod/v4";
import { registerTool, readSkill, getSkillNames, isPluginSkill, hasPluginJs } from "./router.js";
import { getGuardrailsReport } from "../core/guardrails.js";
import { checkCodeGuarded } from "../core/guardrails-guarded.js";
import { extractScaffoldSection, extractSingleScaffoldFile } from "../core/scaffold-parser.js";

/**
 * Register a single skill as an MCP tool.
 * Supports both official rule-* skills and custom plugins.
 *
 * @param {string} skillName - The skill name (e.g. "rule-frontend-react" or "my-custom-rule")
 */
export function registerSkillTool(skillName) {
  const isPlugin = isPluginSkill(skillName);
  const displayName = isPlugin ? skillName.replaceAll("-", "_") : skillName.replace(/^rule-/, "").replaceAll("-", "_");
  const isStyleguides = skillName === "rule-styleguide";
  const modes = isStyleguides
    ? ["full", "summary", "search", "guardrails", "check", "scaffold", "tldr"]
    : ["full", "summary", "search", "guardrails", "check", "tldr"];
  const SkillSchema = z.object({
    query: z.string().optional().describe("Search query (mode=search/tldr)"),
    mode: z
      .enum(modes)
      .default("full")
      .describe("Tool mode: full, summary, tldr, search, guardrails, check" + (isStyleguides ? ", scaffold" : "")),
    code: z.string().optional().describe("Code to check (mode=check)"),
    framework: z.string().optional().describe("Framework hint"),
    file: z.string().optional().describe("Scaffold file"),
    target: z.string().optional().describe("Target dir"),
    fileName: z.string().optional().describe("File name"),
    isComponent: z.boolean().optional(),
    allowedDependencies: z.array(z.string()).optional(),
  });
  registerTool({
    name: "rule_tool_" + displayName,
    description:
      skillName +
      " skill. Modes: full (rules), guardrails (testable assertions), check (validate code), search (find in content)" +
      (isStyleguides ? ", scaffold (project structure)" : "") +
      ".",
    zodSchema: SkillSchema,
    handler: async (arguments_) => {
      const mode = arguments_.mode || "full";
      const query = (arguments_.query || "").toLowerCase();
      const content = readSkill(skillName) || "Skill not found.";

      if (mode === "scaffold" && isStyleguides) {
        const scaffoldSection = extractScaffoldSection(content);

        if (arguments_.file) {
          return extractSingleScaffoldFile(scaffoldSection, arguments_.file);
        }

        return { content: [{ type: "text", text: "# Project Scaffolding\n\n" + scaffoldSection }] };
      }

      if (mode === "guardrails") {
        const gr = getGuardrailsReport(skillName, arguments_.mode);

        return { content: [{ type: "text", text: gr }] };
      }

      if (mode === "check") {
        if (!arguments_.code) {
          return {
            isError: true,
            content: [{ type: "text", text: "mode=check requires a `code` argument with the code to validate." }],
          };
        }

        const result = await checkCodeGuarded(skillName, arguments_.code, {
          fileName: arguments_.fileName,
          isComponent: arguments_.isComponent,
          framework: arguments_.framework,
          mode,
          allowedDependencies: arguments_.allowedDependencies,
        });
        const lines = [
          "# Guardrail check: " + skillName,
          "",
          "**" + result.summary + "**",
          "",
          "Passed: " + result.passCount + "/" + result.total,
          "Failed: " + result.failCount + "/" + result.total,
          "",
        ];

        for (const f of result.failed) {
          lines.push("## ❌ " + f.id + ": " + f.label);

          if (f.failCount > 0) {
            lines.push("Violations: " + f.failCount);
          }

          if (f.detail.length > 0) {
            lines.push("Details: " + f.detail.join(", "));
          }

          lines.push("Fix: " + f.suggestion, "");
        }

        if (result.allPass) {
          lines.push("✅ All guardrails pass. Code is rule-compliant.");
        }

        return {
          isError: !result.allPass,
          content: [{ type: "text", text: lines.join("\n") }],
          _meta: { pixGuardrails: result },
        };
      }

      if (mode === "summary") {
        const lines = content.split("\n").slice(0, 30);

        return {
          content: [{ type: "text", text: "# " + skillName + " (summary)\n\n" + lines.join("\n") + "\n\n..." }],
        };
      }

      if (mode === "search" && query) {
        const lines = content.split("\n");
        const matches = lines
          .map((l, index) => ({ i: index + 1, t: l }))
          .filter((l) => l.t.toLowerCase().includes(query))
          .slice(0, 20);

        return {
          content: [
            {
              type: "text",
              text:
                '# Search "' +
                query +
                '" in ' +
                skillName +
                "\n\n" +
                (matches.length > 0 ? matches.map((x) => "L" + x.i + ": " + x.t).join("\n") : "No matches."),
            },
          ],
        };
      }

      if (mode === "tldr") {
        // BM25-compressed: return only relevant sections
        const { search, buildIndex, isIndexReady } = await import("../core/bm25.js");

        if (!isIndexReady()) {
          buildIndex();
        }
        // Search with larger limit (50) then filter by skill - avoids top-5-before-filter bug
        const results = query
          ? search(query, 50)
              .filter((r) => r.skill === skillName)
              .slice(0, 5)
          : [];

        if (results.length > 0) {
          const lines = ["# " + skillName + " (TLDR)", ""];

          for (const r of results) {
            const snippet = r.snippet.length > 300 ? r.snippet.slice(0, 300) + "..." : r.snippet;
            lines.push("## " + r.section + " _(score: " + r.score + ")", "", snippet, "");
          }

          lines.push("---", "Full skill: call `pix_" + displayName + "` mode=full");

          return { content: [{ type: "text", text: lines.join("\n") }] };
        }

        return { content: [{ type: "text", text: "# " + skillName + " (TLDR)\n\nNo relevant sections found." }] };
      }

      return { content: [{ type: "text", text: "# " + skillName + "\n\n" + content }] };
    },
  });
}
/**
 * Register the pix_search tool for full-text search across ALL rule skills.
 */
export function registerSearchTool() {
  // Lazy imports
  let _bm25 = null;
  async function getBm25() {
    if (!_bm25) {
      _bm25 = await import("../core/bm25.js");
    }

    return _bm25;
  }

  const SearchSchema = z.object({
    query: z.string().describe("Search query to find across all rule skills"),
    maxResults: z.number().int().min(1).max(100).default(10).describe("Maximum number of ranked results"),
  });
  registerTool({
    name: "rule_tool_search",
    description: "Semantic search across ALL rule skills using BM25 ranking. Returns scored, relevant sections.",
    zodSchema: SearchSchema,
    handler: async (arguments_) => {
      const { search, buildIndex, isIndexReady, getIndexStats } = await getBm25();
      // Ensure index is built
      if (!isIndexReady()) {
        buildIndex();
      }
      // Stats line for diagnostics
      const stats = getIndexStats();
      const results = search(arguments_.query, arguments_.maxResults || 10);

      if (!results || results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No results for "${arguments_.query}".${stats ? ` (${stats.totalDocs} sections indexed, ${stats.uniqueTerms} terms)` : ""}`,
            },
          ],
        };
      }
      // Format ranked results
      const lines = [
        `# Search: "${arguments_.query}"`,
        `Found ${results.length} results across ${new Set(results.map((r) => r.skill)).size} skills`,
        `Index: ${stats ? `${stats.totalDocs} sections, ${stats.uniqueTerms} unique terms, avg ${stats.avgDocLength} terms/doc` : ""}`,
        "",
      ];

      for (const r of results) {
        const snippet = r.snippet.length > 150 ? r.snippet.slice(0, 150) + "..." : r.snippet;
        lines.push(`### ${r.skill} \u{2192} ${r.section} _(score: ${r.score})_`, "", `${snippet}`, "");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  });
}
/**
 * Register the pix_check tool for running guardrail checks on code.
 */
export function registerCheckTool() {
  const CheckSchema = z.object({
    skill: z.string().describe("Target rule skill name"),
    code: z.string().describe("Code to validate against guardrails"),
    framework: z.string().optional().describe("Framework (react, vue, svelte, angular, solid, astro, vanilla)"),
    fileName: z.string().optional().describe("File name for naming convention checks"),
    isComponent: z.boolean().optional().describe("Whether this is a component file"),
    mode: z.string().optional().describe("Check mode (e.g. 'scaffold' to validate project config files)"),
    allowedDependencies: z.array(z.string()).optional().describe("Manifest-derived package names allowed in imports"),
  });
  registerTool({
    name: "rule_tool_check",
    description:
      "Run guardrail checks on code against any rule skill. Returns guardrail results with a re-check hint containing the current passing set. Run until allPass: true.",
    zodSchema: CheckSchema,
    handler: async (arguments_) => {
      const { skill, code, fileName, isComponent, framework, mode, allowedDependencies } = arguments_;

      if (!readSkill(skill)) {
        return {
          isError: true,
          content: [{ type: "text", text: "Unknown skill: " + skill + ". Available: " + getSkillNames().join(", ") }],
        };
      }

      const result = await checkCodeGuarded(skill, code, {
        fileName,
        isComponent,
        framework,
        mode,
        previousPassed: [],
        allowedDependencies,
      });
      const lines = ["# Guardrail check: " + skill, ""];
      // Summary line
      const summaryParts = [];

      if (result.failCount > 0) {
        summaryParts.push("❌ " + result.failCount + " FAILING");
      }

      if (result.passCount > 0) {
        summaryParts.push("✅ " + result.passCount + " passing");
      }

      if (result.skippedCount > 0) {
        summaryParts.push("⏩ " + result.skippedCount + " skipped (from previous)");
      }

      lines.push("**" + summaryParts.join(", ") + "** (" + result.total + " total)", "");
      // Show NEW failures only (failures from current code, not skipped ones)
      if (result.failed.length > 0) {
        for (const f of result.failed) {
          lines.push("## ❌ " + f.id + ": " + f.label);

          if (f.failCount > 0) {
            lines.push("- Violations: " + f.failCount);
          }

          if (f.detail.length > 0) {
            lines.push("- Details: `" + f.detail.join("`, `") + "`");
          }

          lines.push("- Fix: " + f.suggestion, "");
        }
      } else if (result.allPass) {
        lines.push("✅ All " + result.total + " guardrails pass. Code is fully rule-compliant.");
      }
      // Show skipped count if any
      if (result.skippedCount > 0) {
        lines.push("### Skipped (previously passed)", "");

        for (const s of result.skipped) {
          lines.push("- ✅ " + s.id + ": " + s.label);
        }

        lines.push("");
      }
      // Re-check hint: emit the passing set so the model can use it on next iteration
      const newPassed = result.previousPassed || [];

      if (!result.allPass) {
        lines.push(
          "---",
          "❌ " + result.failCount + " guardrails FAIL. Fix and re-check.",
          "",
          "Re-check with the same code after fixing failures. Run: pix_check with same skill + updated code.",
          "",
          "Currently passing guardrails (for reference):",
          "```",
        );
        lines.push(newPassed.join(", "), "```");
      }

      return {
        isError: !result.allPass,
        content: [{ type: "text", text: lines.join("\n") }],
        _meta: { pixGuardrails: result },
      };
    },
  });
}
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
              text:
                "# Scaffold Files\n\n" +
                list +
                "\n\nUse `pix_scaffold mode=generate` to create all files, or `pix_scaffold mode=generate file=.prettierrc` for one.",
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
