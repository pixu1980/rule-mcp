

/** @module core/scaffold/templates/multi-file */

import { COMPONENT_TEMPLATES, toPascal, toKebab, interpolate } from "../_template-data.data.js";

function indent(string_, spaces) {
  const pad = " ".repeat(spaces);

  return string_
    .split("\n")
    .map((l) => (l ? pad + l : l))
    .join("\n");
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
      // Markup, not just a `vanilla` key: a file template (playwright-config,
      // the a11y suites) carries its content as a plain string, and treating
      // that as a component emitted a custom element with an empty template.
      if (!t.vanilla?.html) {
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
        content: `export { ${pascal} } from '../_${pascal}.js';\n`,
      });
    }
  }

  return files;
}
