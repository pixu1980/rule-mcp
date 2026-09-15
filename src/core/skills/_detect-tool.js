/** @module core/skills/detect-tool - the pix_tool_detect registration */

import { z } from "zod/v4";
import { registerTool } from "../../tools/router/index.js";
import { detectProjectGraph, getFrameworkSuggestion } from "../detector/index.js";

/** Register the pix_tool_detect tool. */
export function registerDetectTool() {
  const DetectSchema = z.object({
    path: z.string().optional().default(".").describe("Project directory path"),
  });
  registerTool({
    name: "pix_tool_detect",
    description: "Detect project framework, TypeScript usage, and build tool from package.json.",
    zodSchema: DetectSchema,
    handler: async (arguments_) => {
      const projectDir = arguments_.path || ".";
      const profile = detectProjectGraph(projectDir);
      // Suggest relevant skill tools based on detected framework
      const { skillName, toolName } = getFrameworkSuggestion(profile.framework);
      const suggestions = [toolName, "pix_tool_check", "pix_tool_scaffold", "pix_tool_component"];
      const result = {
        ...profile,
        suggested_skills: [skillName],
        suggested_tools: suggestions,
        message:
          `Detected ${profile.framework === "vanilla" ? "vanilla JS" : profile.framework} project "${profile.projectName}". ` +
          `Use ${suggestions.join(", ")} for pix-compliant code generation.`,
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });
}
