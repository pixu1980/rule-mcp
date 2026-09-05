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
import { registerTool } from "./router.js";
import { scanFileTree, autoFixFileTree } from "../core/file-tree.js";

const FixSchema = z.object({
  path: z.string().optional().default(".").describe("Project root directory to scan"),
  srcDir: z.string().optional().default("src").describe("Source directory (default: src)"),
  mode: z
    .enum(["lint", "fix", "generate"])
    .default("lint")
    .describe("lint: scan and report issues. fix: scan and auto-fix. generate: generate component file tree."),
  name: z.string().optional().describe("Component name (PascalCase) for mode=generate"),
  framework: z.string().optional().default("vanilla").describe("Framework for mode=generate"),
  baseDir: z.string().optional().default("src/components").describe("Base output directory for mode=generate"),
  dryRun: z
    .boolean()
    .optional()
    .default(true)
    .describe("Preview fixes without applying (default: true). Set false to apply."),
});

/**
 * Register the pix_fix tool.
 * Called during skill loading in loadAllSkills().
 */
export function registerFixTool() {
  registerTool({
    name: "rule_tool_fix",
    description:
      "Validate and auto-fix project file tree structure against rule AI conventions (barrel files, _PascalCase naming, etc.).",
    zodSchema: FixSchema,
    handler: async (arguments_) => {
      const mode = arguments_.mode || "lint";

      // ── Generate mode: create component file tree ──
      if (mode === "generate") {
        const { generateComponentFiles } = await import("../core/file-tree.js");
        const { writeFileSync, mkdirSync } = await import("node:fs");
        const { dirname, join, resolve, relative } = await import("node:path");

        if (!arguments_.name) {
          return {
            isError: true,
            content: [{ type: "text", text: "mode=generate requires a `name` argument (PascalCase)." }],
          };
        }

        const isDryRun = arguments_.dryRun !== false;
        const rootDir = resolve(arguments_.path || ".");
        const baseDir = arguments_.baseDir || "src/components";

        // Validate: no path traversal in name or baseDir
        const sanitizedBase = relative(rootDir, resolve(rootDir, baseDir));

        if (sanitizedBase.startsWith("..") || sanitizedBase === "") {
          return {
            isError: true,
            content: [
              { type: "text", text: `baseDir "${baseDir}" escapes project root "${rootDir}". Refusing to generate.` },
            ],
          };
        }

        const files = generateComponentFiles({
          name: arguments_.name,
          framework: arguments_.framework || "vanilla",
          baseDir,
        });

        const preview = [];

        for (const file of files) {
          const fullPath = resolve(rootDir, file.path);
          // Block path traversal: resolved path must stay inside rootDir
          const rel = relative(rootDir, fullPath);

          if (rel.startsWith("..") || rel === "") {
            preview.push(`${file.path} - BLOCKED: path escapes project root`);
            continue;
          }

          if (isDryRun) {
            preview.push(`${file.path} (dry-run, not written)`);
            continue;
          }

          try {
            mkdirSync(dirname(fullPath), { recursive: true });
            writeFileSync(fullPath, file.content, "utf8");
            preview.push(file.path);
          } catch (error) {
            preview.push(`${file.path} - ERROR: ${error.message}`);
          }
        }

        const lines = [
          `# pix_fix: Generated ${arguments_.name}`,
          "",
          isDryRun ? "> This is a preview. Run with `dryRun=false` to write files." : "",
          "",
          `${isDryRun ? "Would create" : "Created"} ${preview.length} files:`,
          "",
          ...preview.map((p) => `  ✓ ${p}`),
          "",
          "File tree:",
          `  ${baseDir}/${arguments_.name}/`,
          ...files.map((f) => `    ${f.path.split("/").pop()}`).filter(Boolean),
        ].filter(Boolean);

        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      // ── Lint mode: scan and report ──
      if (mode === "lint") {
        const report = scanFileTree(arguments_.path || ".", { srcDir: arguments_.srcDir || "src" });

        if (report.pass) {
          return {
            content: [
              {
                type: "text",
                text: `# File Tree Validation: PASS\n\n✅ No issues found. Scanned ${report.stats.totalFiles} files in ${report.stats.totalDirs} directories.`,
              },
            ],
          };
        }

        const lines = [
          `# File Tree Validation: ${report.issues.length} issues`,
          "",
          `Scanned: ${report.stats.totalFiles} files, ${report.stats.totalDirs} directories`,
          "",
          "## Summary",
          `- Missing barrel files: ${report.stats.missingBarrel}`,
          `- Wrong file prefix: ${report.stats.wrongPrefix}`,
          `- Bare component files: ${report.stats.bareFiles}`,
          `- Fixable: ${report.stats.fixable}/${report.issues.length}`,
          "",
          "## Issues",
          "",
        ];

        for (const issue of report.issues) {
          const icon = issue.fixable ? "🔧" : "⚠️";
          lines.push(`### ${icon} ${issue.type}`, `**Path**: \`${issue.path}\``, `**Message**: ${issue.message}`);

          if (issue.fixAction) {
            lines.push(`**Auto-fix**: ${issue.fixAction}`);
          }

          lines.push("");
        }

        lines.push("---");

        if (report.stats.fixable > 0) {
          lines.push(`Run with \`mode=fix dryRun=false\` to auto-fix ${report.stats.fixable} issues.`);
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      // ── Fix mode: scan and auto-correct ──
      if (mode === "fix") {
        const isDryRun = arguments_.dryRun !== false;
        const result = autoFixFileTree(arguments_.path || ".", {
          srcDir: arguments_.srcDir || "src",
          dryRun: isDryRun,
        });

        const lines = [
          `# File Tree Auto-Fix: ${isDryRun ? "DRY RUN" : "COMPLETE"}`,
          "",
          ...(isDryRun ? ["", "> This is a preview. Run with `dryRun=false` to apply fixes.", ""] : [""]),
        ];

        if (result.fixed.length > 0) {
          lines.push(`## Fixed (${result.fixed.length})`, "");

          for (const f of result.fixed) {
            lines.push(`- ${f.action}: \`${f.path}\``);
          }

          lines.push("");
        }

        if (result.errors.length > 0) {
          lines.push(`## Errors (${result.errors.length})`, "");

          for (const e of result.errors) {
            lines.push(`- ❌ \`${e.path}\`: ${e.error}`);
          }

          lines.push("");
        }

        if (result.remaining.length > 0) {
          lines.push(`## Remaining Issues (${result.remaining.length})`, "");

          for (const r of result.remaining) {
            lines.push(`- ⚠️ \`${r.path}\`: ${r.message}`);
          }

          lines.push("");
        }

        if (result.fixed.length === 0 && result.errors.length === 0 && result.remaining.length === 0) {
          lines.push("✅ No issues found. File tree is clean.");
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      return { isError: true, content: [{ type: "text", text: `Unknown mode: ${mode}` }] };
    },
  });
}
