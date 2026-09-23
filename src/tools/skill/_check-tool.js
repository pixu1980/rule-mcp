

/** @module tools/skill/check-tool */

import { z } from "zod/v4";
import { registerTool, readSkill, getSkillNames } from "../router/index.js";
import { checkCodeGuarded, checkProjectGuarded } from "../../core/guardrails/index.js";

/**
 * Register the rule_tool_check tool for running guardrail checks on code.
 */
export function registerCheckTool() {
  const CheckSchema = z.object({
    skill: z.string().describe("Target rule skill name"),
    code: z.string().optional().describe("Code to validate against guardrails (omit with mode=project)"),
    framework: z.string().optional().describe("Framework (react, vue, svelte, angular, solid, astro, vanilla)"),
    fileName: z.string().optional().describe("File name for naming convention checks"),
    isComponent: z.boolean().optional().describe("Whether this is a component file"),
    mode: z.string().optional().describe("Check mode: 'scaffold' for project config files, 'project' for the graph guardrails"),
    allowedDependencies: z.array(z.string()).optional().describe("Manifest-derived package names allowed in imports"),
    projectDir: z.string().optional().describe("Project root for mode=project (default: cwd)"),
    diagnostics: z.boolean().optional().describe("Run the optional type-checker check in mode=project"),
  });
  registerTool({
    name: "rule_tool_check",
    entry: "action",
    description: "Run guardrail checks on code against any rule skill. Returns guardrail results with a re-check hint containing the current passing set. Run until allPass: true.",
    zodSchema: CheckSchema,
    handler: async (arguments_) => {
      const { skill, code, fileName, isComponent, framework, mode, allowedDependencies, projectDir } = arguments_;

      if (mode === "project") {
        const project = checkProjectGuarded(projectDir ?? ".", { skill, diagnostics: arguments_.diagnostics === true });
        const projectLines = ["# Project guardrails", "", project.summary, ""];

        for (const entry of project.failed) {
          projectLines.push("## ❌ " + entry.id + ": " + entry.label, "", "- Failures: " + entry.failCount);

          for (const detail of entry.detail ?? []) {
            projectLines.push("- " + detail);
          }

          projectLines.push("- Fix: " + entry.suggestion, "");
        }

        if (project.skippedCount > 0) {
          projectLines.push("### Skipped", "");

          for (const entry of project.skipped) {
            projectLines.push("- ⏩ " + entry.id + ": " + entry.reason);
          }

          projectLines.push("");
        }

        return { isError: !project.allPass, content: [{ type: "text", text: projectLines.join("\n") }], _meta: { pixProjectGuardrails: project } };
      }

      if (typeof code !== "string") {
        return { isError: true, content: [{ type: "text", text: "rule_tool_check needs `code`, or `mode=project` to check the project graph." }] };
      }

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
          "Re-check with the same code after fixing failures. Run: rule_tool_check with same skill + updated code.",
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
