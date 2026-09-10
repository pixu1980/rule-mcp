

/** @module tools/skill/check-tool */

import { z } from "zod/v4";
import { registerTool, readSkill, getSkillNames } from "../router/index.js";
import { checkCodeGuarded } from "../../core/guardrails/index.js";

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
    description: "Run guardrail checks on code against any rule skill. Returns guardrail results with a re-check hint containing the current passing set. Run until allPass: true.",
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
