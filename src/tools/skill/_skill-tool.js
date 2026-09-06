/** @module tools/skill/skill-tool */

import { z } from "zod/v4";
import { registerTool, readSkill, isPluginSkill } from "../router/index.js";
import { getGuardrailsReport } from "../../core/guardrails/index.js";
import { checkMode, scaffoldMode, searchMode, summaryMode, tldrMode } from "./_skill-modes.js";

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
  const modes = isStyleguides ? ["full", "summary", "search", "guardrails", "check", "scaffold", "tldr"] : ["full", "summary", "search", "guardrails", "check", "tldr"];
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
        return scaffoldMode(content, arguments_);
      }

      if (mode === "guardrails") {
        return { content: [{ type: "text", text: getGuardrailsReport(skillName, arguments_.mode) }] };
      }

      if (mode === "check") {
        return checkMode(skillName, arguments_);
      }

      if (mode === "summary") {
        return summaryMode(skillName, content);
      }

      if (mode === "search" && query) {
        return searchMode(skillName, content, query);
      }

      if (mode === "tldr") {
        return tldrMode(skillName, displayName, query);
      }

      return { content: [{ type: "text", text: "# " + skillName + "\n\n" + content }] };
    },
  });
}
