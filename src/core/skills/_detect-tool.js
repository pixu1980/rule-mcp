/** @module core/skills/detect-tool - the rule_tool_detect registration */

import { z } from "zod/v4";
import { registerTool } from "../../tools/router/index.js";
import { detectProjectGraph, getFrameworkSuggestion } from "../detector/index.js";

/** Register the rule_tool_detect tool. */
export function registerDetectTool() {
  const DetectSchema = z.object({
    path: z.string().optional().default(".").describe("Project directory path"),
  });
  registerTool({
    name: "rule_tool_detect",
    entry: "action",
    description: "Detect project framework, TypeScript usage, and build tool from package.json.",
    zodSchema: DetectSchema,
    handler: async (arguments_) => {
      const projectDir = arguments_.path || ".";
      const profile = detectProjectGraph(projectDir);
      // Suggest relevant skill tools based on detected framework
      const { skillName, toolName } = getFrameworkSuggestion(profile.framework);
      const suggestions = [toolName, "rule_tool_check", "rule_tool_styleguide"];
      const result = {
        ...profile,
        suggested_skills: [skillName],
        suggested_tools: suggestions,
        message:
          `Detected ${profile.framework === "vanilla" ? "vanilla JS" : profile.framework} project "${profile.projectName}". ` +
          `Use ${suggestions.join(", ")} and /rule-area-styleguide* for rule-mcp-compliant generation.`,
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });
}
