/** Generate a convention-correct component folder for a framework. */
import { join } from "node:path";

/**
 * Convert PascalCase to kebab-case (e.g. MyButton → my-button).
 * @param {string} name
 * @returns {string}
 */
function toKebab(name) {
  return name
    .replaceAll(/([a-z])([A-Z])/g, "$1-$2")
    .replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Generate the full file tree for a component following rule AI conventions.
 * Returns an array of { path, content } objects.
 *
 * @param {object} options
 * @param {string} options.name - Component name (PascalCase)
 * @param {string} options.framework - Framework (react, vue, svelte, angular, solid, astro, vanilla)
 * @param {string} [options.baseDir="src/components"] - Base output directory
 * @returns {Array<{ path: string, content: string }>}
 */
export function generateComponentFiles(options) {
  const { name, framework = "vanilla", baseDir = "src/components" } = options;
  const tag = toKebab(name); // guarantees a valid custom element tag with hyphen
  const folderPath = join(baseDir, name);
  const files = [];

  // Barrel file
  const barrelContent = `/**\n * @module ${name}\n * @description ${name} component\n */\n\nexport { ${name} } from './_${name}';\n`;
  files.push({ path: join(folderPath, "index.js"), content: barrelContent });

  // Component file
  let componentContent;
  const componentFilePath = join(folderPath, `_${name}`);

  switch (framework) {
    case "react":
    case "solid": {
      componentContent = `/**\n * @module ${name}\n * @description ${name} component\n */\n\nexport function ${name}({ children }) {\n  return (\n    <article data-part="${name.toLowerCase()}">\n      {children}\n    </article>\n  );\n}\n`;
      files.push({ path: `${componentFilePath}.jsx`, content: componentContent });
      break;
    }

    case "vue": {
      componentContent = `<script setup>\n/**\n * @module ${name}\n * @description ${name} component\n */\ndefineProps({});\n</script>\n\n<template>\n  <article data-part="${name.toLowerCase()}">\n    <slot />\n  </article>\n</template>\n`;
      files.push({ path: `${componentFilePath}.vue`, content: componentContent });
      break;
    }

    case "svelte": {
      componentContent = `<script>\n/**\n * @module ${name}\n * @description ${name} component\n */\nlet { children } = $props();\n</script>\n\n<article data-part="${name.toLowerCase()}">\n  {@render children()}\n</article>\n`;
      files.push({ path: `${componentFilePath}.svelte`, content: componentContent });
      break;
    }

    case "angular": {
      componentContent = `import { Component } from '@angular/core';\n\n/**\n * @module ${name}\n * @description ${name} component\n */\n@Component({\n  selector: '${tag}',\n  standalone: true,\n  template: \`<article data-part="${name.toLowerCase()}"><ng-content /></article>\`,\n})\nexport class ${name} {}\n`;
      files.push({ path: `${componentFilePath}.ts`, content: componentContent });
      break;
    }

    case "astro": {
      componentContent = `---\n/**\n * @module ${name}\n * @description ${name} component\n */\n---\n<article data-part="${name.toLowerCase()}">\n  <slot />\n</article>\n`;
      files.push({ path: `${componentFilePath}.astro`, content: componentContent });
      break;
    }

    case "vanilla":
    default: {
      componentContent = `/**\n * @module ${name}\n * @description ${name} component\n */\n\nexport class ${name} extends HTMLElement {\n  connectedCallback() {\n    this.innerHTML = \`<article data-part="${name.toLowerCase()}"></article>\`;\n  }\n}\n\ncustomElements.define("${tag}", ${name});\n`;
      files.push({ path: `${componentFilePath}.js`, content: componentContent });
      break;
    }
  }

  return files;
}
