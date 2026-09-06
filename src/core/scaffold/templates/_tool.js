/** @module core/scaffold/templates/tool */

import { z } from "zod/v4";
import { registerTool } from "../../../tools/router/index.js";
import { COMPONENT_TEMPLATES } from "../_template-data.js";
import { guardrailSummary } from "./_guardrail-summary.js";
import { buildGuardrailsText } from "./_guardrails-text.js";
import { generateMultiFile } from "./_multi-file.js";
import { getTemplate } from "./_lookup.js";

export function registerTemplateTool() {
  const ComponentSchema = z.object({
    component: z.string().describe("Component or test type"),
    framework: z.enum(["vanilla", "react", "vue", "svelte", "angular", "solid", "astro"]).default("vanilla"),
    name: z.string().optional().describe("Component name for multi-file generation"),
    mode: z.enum(["generate", "multi", "guardrails"]).default("generate"),
  });

  registerTool({
    name: "rule_tool_component",
    description: "Generate component or test templates following rule AI principles.",
    zodSchema: ComponentSchema,
    handler: async (arguments_) => {
      if (arguments_.mode === "guardrails") {
        return { content: [{ type: "text", text: buildGuardrailsText() }] };
      }

      const component = arguments_.component;
      const framework = arguments_.framework || "vanilla";

      if (!COMPONENT_TEMPLATES[component]) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Unknown: " + component + ". Available: " + Object.keys(COMPONENT_TEMPLATES).join(", "),
            },
          ],
        };
      }

      if (arguments_.mode === "multi") {
        const files = generateMultiFile(component, framework, arguments_.name);

        if (!files || files.length === 0) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: 'Cannot generate multi-file output for "' + component + '" with "' + framework + '".',
              },
            ],
          };
        }

        const combined = files.map((f) => f.content).join("\n\n");

        return {
          content: [
            {
              type: "text",
              text:
                "# Generated: " +
                component +
                " → " +
                framework +
                " (" +
                files.length +
                " files)\n\n" +
                files.map((f) => "  " + f.path).join("\n") +
                "\n\n---\n\n" +
                files.map((f) => "### `" + f.path + "`\n\n```" + f.language + "\n" + f.content + "\n```").join("\n\n") +
                "\n\n" +
                guardrailSummary(framework, combined),
            },
          ],
        };
      }

      const template = getTemplate(component, framework);

      if (!template) {
        return { isError: true, content: [{ type: "text", text: "Unknown: " + component }] };
      }

      if (typeof template === "object" && template.html && template.css) {
        return {
          content: [
            {
              type: "text",
              text:
                "# " +
                component +
                " - " +
                framework +
                "\n\n## HTML\n```html\n" +
                template.html +
                "\n```\n\n## CSS\n```css\n" +
                template.css +
                "\n```\n\n" +
                guardrailSummary("vanilla", String(template.html) + "\n" + String(template.css)),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text:
              "# " +
              component +
              " - " +
              framework +
              "\n\n```\n" +
              template +
              "\n```\n\n" +
              guardrailSummary(framework, String(template)),
          },
        ],
      };
    },
  });
}
