/**
 * @module core/templates
 *
 * Design system component templates - public API.
 * Template data (COMPONENT_TEMPLATES + helpers) lives in template-data.js.
 *
 * Provides: generateMultiFile, getTemplate, registerTemplateTool.
 */

import { z } from "zod/v4";
import { registerTool } from "../tools/router.js";
import { COMPONENT_TEMPLATES, toPascal, toKebab, interpolate } from "./template-data.js";
import { checkCode } from "./guardrails.js";

/** Framework → canonical skill name, so component output is validated against
 *  the same guardrails the agent's own code would face. */
const FRAMEWORK_SKILL = {
  react: "rule-frontend-react",
  vue: "rule-frontend-vue",
  svelte: "rule-frontend-svelte",
  angular: "rule-frontend-angular",
  solid: "rule-frontend-solidjs",
  astro: "rule-frontend-meta-astro",
  vanilla: "rule-styleguide",
};

/**
 * Validate generated template code against its skill's guardrails and return a
 * short compliance summary. Guarantees guardrails are ALWAYS involved in
 * component generation, not only when the agent later calls pix_check.
 *
 * @param {string} framework
 * @param {string} code - the emitted code (concatenated for multi-file)
 * @returns {string} markdown summary line(s)
 */
function guardrailSummary(framework, code) {
  const skillName = FRAMEWORK_SKILL[framework] || "rule-styleguide";
  const report = checkCode(skillName, code, { framework, isComponent: true });

  if (report.allPass) {
    return `## Guardrails\n\n✅ ${report.passCount}/${report.total} guardrails pass (${skillName}). Validated with pix_check.`;
  }

  const lines = [`## Guardrails\n\n⚠️ ${report.failCount}/${report.total} FAIL (${skillName}). Fix before shipping:`];

  for (const f of report.failed) {
    lines.push(`- **${f.id}**: ${f.label} - ${f.suggestion}`);
  }

  return lines.join("\n");
}

/**
 * Generate multi-file component output.
 * Returns array of { path, language, content } for the full file tree.
 */
export function generateMultiFile(component, framework = "vanilla", name) {
  const pascal = toPascal(name || component);
  const kebab = toKebab(pascal);
  const t = COMPONENT_TEMPLATES[component];

  if (!t) {
    return null;
  }

  const basePath = `src/components/${pascal}`;
  const files = [];
  const variables = { Name: pascal, name: kebab, Name_lower: name || component };
  const vanillaCss = t.vanilla?.css || "";
  const interpCss = interpolate(vanillaCss, variables);

  switch (framework) {
    case "react":
    case "solid": {
      const extension = ".jsx";
      const source = t[framework] || t.react;
      let compSource;

      if (source && typeof source === "string") {
        compSource = interpolate(source, variables);
      } else if (t.vanilla?.html) {
        compSource = `export function ${pascal}({ children }) {\n  return (\n${indent(t.vanilla.html, 4)}\n  );\n}`;
      } else {
        return null;
      }

      if (!compSource.includes(`export function ${pascal}`)) {
        compSource = compSource.replace(/export function \w+/, `export function ${pascal}`);
      }

      files.push({ path: `${basePath}/_${pascal}${extension}`, language: "jsx", content: compSource });

      if (interpCss) {
        files.push({ path: `${basePath}/_${pascal}.css`, language: "css", content: interpCss });
      }

      files.push({
        path: `${basePath}/index.js`,
        language: "javascript",
        content: `export { ${pascal} } from './_${pascal}${extension}';\n`,
      });
      break;
    }

    case "vue": {
      const source = t.vue;
      let content;

      if (source && typeof source === "string") {
        content = interpolate(source, variables);
      } else if (t.vanilla?.html) {
        content = `<script setup>\ndefineProps({});\n</script>\n\n<template>\n${indent(interpolate(t.vanilla.html, variables), 2)}\n</template>\n\n<style scoped>\n${interpCss}\n</style>`;
      } else {
        return null;
      }

      files.push(
        { path: `${basePath}/_${pascal}.vue`, language: "vue", content },
        {
          path: `${basePath}/index.js`,
          language: "javascript",
          content: `export { default as ${pascal} } from './_${pascal}.vue';\n`,
        },
      );
      break;
    }

    case "svelte": {
      const source = t.svelte;
      let content;

      if (source && typeof source === "string") {
        content = interpolate(source, variables);
      } else if (t.vanilla?.html) {
        content = `<script>\nlet { children } = $props();\n</script>\n\n${interpolate(t.vanilla.html, variables)}\n\n<style>\n${interpCss}\n</style>`;
      } else {
        return null;
      }

      files.push(
        { path: `${basePath}/_${pascal}.svelte`, language: "svelte", content },
        {
          path: `${basePath}/index.js`,
          language: "javascript",
          content: `export { default as ${pascal} } from './_${pascal}.svelte';\n`,
        },
      );
      break;
    }
    default: {
      if (!t.vanilla) {
        return null;
      }

      const html = interpolate(t.vanilla.html || "", variables);
      const jsContent = `/**\n * @module ${basePath}/_${pascal}\n * @description ${t.description}\n */\n\nconst template = document.createElement("template");\ntemplate.innerHTML = \`${html.replaceAll("`", "\\`")}\`;\n\nexport class ${pascal} extends HTMLElement {\n  connectedCallback() {\n    this.append(template.content.cloneNode(true));\n  }\n}\n\ncustomElements.define("${kebab}", ${pascal});\n`;
      files.push({ path: `${basePath}/_${pascal}.js`, language: "javascript", content: jsContent });

      if (interpCss) {
        files.push({ path: `${basePath}/_${pascal}.css`, language: "css", content: interpCss });
      }

      files.push({
        path: `${basePath}/index.js`,
        language: "javascript",
        content: `export { ${pascal} } from './_${pascal}.js';\n`,
      });
    }
  }

  return files;
}

export function listTemplateCategories() {
  return Object.entries(COMPONENT_TEMPLATES).map(([name, t]) => ({
    name,
    description: t.description,
    frameworks: ["vanilla", "react", "vue", "svelte", "angular", "solid", "astro"],
  }));
}

export function getTemplate(component, framework = "vanilla") {
  const t = COMPONENT_TEMPLATES[component];

  if (!t) {
    return null;
  }

  if (framework === "vanilla" && t.vanilla) {
    return t.vanilla;
  }

  const key = framework;

  if (t[key]) {
    return t[key];
  }

  if (t.vanilla) {
    return t.vanilla;
  }

  return null;
}

function indent(string_, spaces) {
  const pad = " ".repeat(spaces);

  return string_
    .split("\n")
    .map((l) => (l ? pad + l : l))
    .join("\n");
}

function buildGuardrailsText() {
  const lines = [
    "# Component Guardrails",
    "",
    "## Shared (all components)",
    "- [ ] **no-css-classes**: CSS uses element + [data-part] selectors only. No .class rules.",
    "- [ ] **no-inline-styles**: Template has no style=... attributes.",
    "- [ ] **semantic-html**: No <div> where semantic element exists.",
    "- [ ] **external-css**: CSS loaded externally (adoptedStyleSheets or framework-native).",
    "- [ ] **data-part-naming**: Child elements have data-part=role attributes.",
    "- [ ] **element-attr-selectors**: CSS uses element or [data-part=] only.",
    "- [ ] **file-naming**: File is _PascalCase.ext. Folder is PascalCase/. Barrel: index.js.",
    "",
    "## A11y Testing (MANDATORY)",
    "- [ ] **a11y-test-basic**: tests/a11y/_basic.spec.js - page structure, headings, landmarks",
    "- [ ] **a11y-test-forms**: tests/a11y/_forms.spec.js - form inputs, labels, errors",
    "- [ ] **a11y-test-components**: tests/a11y/_components.spec.js - per-component a11y checks",
    "- [ ] **playwright-config**: playwright.config.js with Chromium target",
    "",
    "Use rule_tool_component component=a11y-test-basic to generate test templates.",
    "Use rule_tool_check for automated validation.",
    "Iterate: generate, rule_tool_check, fix, rule_tool_check, all pass.",
  ];

  return lines.join("\n");
}

export function registerTemplateTool() {
  const componentKeys = Object.keys(COMPONENT_TEMPLATES);
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
