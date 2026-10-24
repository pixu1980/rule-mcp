/**
 * @module core/template-data
 *
 * Component template definitions and string helpers.
 * Extracted from templates.js to keep the API module lean.
 */

export const COMPONENT_TEMPLATES = {
  button: {
    description: "Primary action button",
    vanilla: {
      html: '<button type="button" data-part="button" data-kind="primary" data-size="md">\n  <span data-part="label">{{ label }}</span>\n</button>',
      css: '[data-part="button"] {\n  background: var(--color-accent);\n  color: var(--color-accent-text);\n  border: none;\n  border-radius: 0.4rem;\n  padding: 0.8rem 1.6rem;\n  font-size: 1.4rem;\n  cursor: pointer;\n  transition: filter 200ms ease;\n}\n[data-part="button"]:hover { filter: brightness(1.1); }\n[data-part="button"][data-kind="secondary"] {\n  background: transparent;\n  border: 0.1rem solid var(--color-border);\n  color: var(--color-text);\n}\n[data-part="button"][data-size="sm"] { padding: 0.4rem 0.8rem; font-size: 1.2rem; }\n[data-part="button"][data-size="lg"] { padding: 1.2rem 2.4rem; font-size: 1.6rem; }',
    },
    react:
      '/**\n * Primary action button.\n * @param {{ label: string, kind?: string, size?: string, onClick?: () => void }} props\n */\nexport function Button({ label, kind = "primary", size = "md", onClick }) {\n  return (\n    <button type="button" data-part="button" data-kind={kind} data-size={size} onClick={onClick}>\n      <span data-part="label">{label}</span>\n    </button>\n  );\n}',
    vue: '<script setup>\ndefineProps({ label: String, kind: { type: String, default: "primary" }, size: { type: String, default: "md" } });\ndefineEmits(["click"]);\n</script>\n<template>\n  <button data-part="button" :data-kind="kind" :data-size="size" @click="$emit(\'click\')">\n    <span data-part="label">{{ label }}</span>\n  </button>\n</template>',
    svelte:
      '<script>\n/**\n * Primary action button.\n * @param {{ label: string, kind?: string, size?: string, onclick?: () => void }} props\n */\nlet { label, kind = "primary", size = "md", onclick } = $props();\n</script>\n<button type="button" data-part="button" data-kind={kind} data-size={size} {onclick}>\n  <span data-part="label">{label}</span>\n</button>',
  },
  card: {
    description: "Container card with optional header, body, footer",
    vanilla: {
      html: '<article data-part="card">\n  <header data-part="card-header">{{ title }}</header>\n  <section data-part="card-body"><slot></section>\n  <footer data-part="card-footer">{{ footer }}</footer>\n</article>',
      css: '[data-part="card"] {\n  border: 0.1rem solid var(--color-border);\n  border-radius: 0.8rem;\n  background: var(--color-surface);\n  overflow: hidden;\n}\n[data-part="card-header"] { padding: 1.2rem 1.6rem; border-bottom: 0.1rem solid var(--color-border); font-weight: 600; }\n[data-part="card-body"] { padding: 1.6rem; }\n[data-part="card-footer"] { padding: 1.2rem 1.6rem; border-top: 0.1rem solid var(--color-border); }',
    },
    react:
      'export function Card({ title, footer, children }) {\n  return (\n    <article data-part="card">\n      {title && <header data-part="card-header">{title}</header>}\n      <section data-part="card-body">{children}</section>\n      {footer && <footer data-part="card-footer">{footer}</footer>}\n    </article>\n  );\n}',
    vue: '<script setup>\ndefineProps({ title: String, footer: String });\n</script>\n<template>\n  <article data-part="card">\n    <header v-if="title" data-part="card-header">{{ title }}</header>\n    <section data-part="card-body"><slot /></section>\n    <footer v-if="footer" data-part="card-footer">{{ footer }}</footer>\n  </article>\n</template>',
    svelte:
      '<script>\nlet { title, footer, children } = $props();\n</script>\n<article data-part="card">\n  {#if title}<header data-part="card-header">{title}</header>{/if}\n  <section data-part="card-body">{@render children()}</section>\n  {#if footer}<footer data-part="card-footer">{footer}</footer>{/if}\n</article>',
  },
  modal: {
    description: "Overlay modal dialog",
    vanilla: {
      html: '<dialog data-part="modal">\n  <header data-part="modal-header">\n    <h2 data-part="modal-title">{{ title }}</h2>\n    <button type="button" data-part="close" aria-label="Close dialog">✕</button>\n  </header>\n  <section data-part="modal-body"><slot></section>\n  <footer data-part="modal-footer">\n    <button type="button" data-kind="secondary" data-part="close">Cancel</button>\n    <button type="button" data-part="confirm">Confirm</button>\n  </footer>\n</dialog>',
      css: '[data-part="modal"] {\n  background: var(--color-surface);\n  border: 0.1rem solid var(--color-border);\n  border-radius: 0.8rem;\n  width: 52rem;\n  max-height: 80vh;\n  overflow: auto;\n  box-shadow: 0 0.8rem 3.2rem rgba(0,0,0,0.4);\n}\n[data-part="modal-header"] { display: flex; justify-content: space-between; align-items: center; padding: 1.2rem 1.6rem; border-bottom: 0.1rem solid var(--color-border); }\n[data-part="modal-body"] { padding: 1.6rem; }\n[data-part="modal-footer"] { display: flex; justify-content: flex-end; gap: 0.8rem; padding: 1.2rem 1.6rem; border-top: 0.1rem solid var(--color-border); }',
    },
    react:
      '/**\n * Modal dialog.\n * @param {{ title: string, children: React.ReactNode, onClose?: () => void, onConfirm?: () => void }} props\n */\nexport function Modal({ title, children, onClose, onConfirm }) {\n  return (\n    <dialog data-part="modal">\n      <header data-part="modal-header">\n        <h2 data-part="modal-title">{title}</h2>\n        <button type="button" data-part="close" onClick={onClose} aria-label="Close dialog">✕</button>\n      </header>\n      <section data-part="modal-body">{children}</section>\n      <footer data-part="modal-footer">\n        <button type="button" data-kind="secondary" data-part="close" onClick={onClose}>Cancel</button>\n        <button type="button" data-part="confirm" onClick={onConfirm}>Confirm</button>\n      </footer>\n    </dialog>\n  );\n}',
    vue: '<script setup>\ndefineProps({ title: String });\ndefineEmits(["close", "confirm"]);\n</script>\n<template>\n  <dialog data-part="modal">\n    <header data-part="modal-header">\n      <h2 data-part="modal-title">{{ title }}</h2>\n      <button type="button" data-part="close" @click="$emit(\'close\')" aria-label="Close dialog">✕</button>\n    </header>\n    <section data-part="modal-body"><slot /></section>\n    <footer data-part="modal-footer">\n      <button type="button" data-kind="secondary" data-part="close" @click="$emit(\'close\')">Cancel</button>\n      <button type="button" data-part="confirm" @click="$emit(\'confirm\')">Confirm</button>\n    </footer>\n  </dialog>\n</template>',
    svelte:
      '<script>\n/**\n * Modal dialog.\n * @param {{ title: string, children: any, onclose?: () => void, onconfirm?: () => void }} props\n */\nlet { title, children, onclose, onconfirm } = $props();\n</script>\n<dialog data-part="modal">\n  <header data-part="modal-header">\n    <h2 data-part="modal-title">{title}</h2>\n    <button type="button" data-part="close" {onclose} aria-label="Close dialog">✕</button>\n  </header>\n  <section data-part="modal-body">{@render children()}</section>\n  <footer data-part="modal-footer">\n    <button type="button" data-kind="secondary" data-part="close" {onclose}>Cancel</button>\n    <button type="button" data-part="confirm" {onconfirm}>Confirm</button>\n  </footer>\n</dialog>',
  },
  formField: {
    description: "Form field with label, input, optional error",
    vanilla: {
      html: '<div data-part="field">\n  <label data-part="label" for="{{ id }}">{{ label }}</label>\n  <input data-part="input" id="{{ id }}" type="{{ type }}" placeholder="{{ placeholder }}" />\n  <span data-part="error">{{ error }}</span>\n</div>',
      css: '[data-part="field"] { margin-bottom: 1rem; }\n[data-part="label"] { display: block; font-size: 1.2rem; color: var(--color-text-secondary); margin-bottom: 0.3rem; }\n[data-part="input"] { width: 100%; padding: 0.8rem 1rem; background: var(--color-input-bg); color: var(--color-text); border: 0.1rem solid var(--color-border); border-radius: 0.4rem; }\n[data-part="input"]:focus { outline: none; border-color: var(--color-accent); }\n[data-part="error"] { display: block; font-size: 1.1rem; color: var(--color-danger); margin-top: 0.2rem; }',
    },
    react:
      'export function FormField({ id, label, type = "text", placeholder, error, value, onChange }) {\n  return (\n    <div data-part="field">\n      <label data-part="label" htmlFor={id}>{label}</label>\n      <input data-part="input" id={id} type={type} placeholder={placeholder} value={value} onChange={onChange} />\n      {error && <span data-part="error">{error}</span>}\n    </div>\n  );\n}',
    vue: '<script setup>\ndefineProps({ id: String, label: String, type: { type: String, default: "text" }, placeholder: String, error: String, modelValue: String });\ndefineEmits(["update:modelValue"]);\n</script>\n<template>\n  <div data-part="field">\n    <label data-part="label" :for="id">{{ label }}</label>\n    <input data-part="input" :id="id" :type="type" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />\n    <span v-if="error" data-part="error">{{ error }}</span>\n  </div>\n</template>',
    svelte:
      '<script>\nlet { id, label, type = "text", placeholder, error, value, oninput } = $props();\n</script>\n<div data-part="field">\n  <label data-part="label" for={id}>{label}</label>\n  <input data-part="input" {id} {type} {placeholder} {value} {oninput} />\n  {#if error}<span data-part="error">{error}</span>{/if}\n</div>',
  },
  list: {
    description: "Unordered/ordered list of items",
    vanilla: {
      html: '<ul data-part="list">\n  <li data-part="item" data-index="{{ i }}">{{ content }}</li>\n</ul>',
      css: '[data-part="list"] { list-style: none; margin: 0; padding: 0; }\n[data-part="item"] { padding: 0.8rem; border-bottom: 0.1rem solid var(--color-border); display: flex; align-items: center; gap: 0.8rem; }\n[data-part="item"]:last-child { border-bottom: none; }',
    },
    react:
      'export function List({ items, renderItem }) {\n  return (\n    <ul data-part="list">\n      {items.map((item, index) => (\n        <li key={item.id ?? index} data-part="item">{renderItem ? renderItem(item) : item}</li>\n      ))}\n    </ul>\n  );\n}',
    vue: '<script setup>\ndefineProps({ items: Array });\n</script>\n<template>\n  <ul data-part="list">\n    <li v-for="(item, i) in items" :key="item.id ?? i" data-part="item">\n      <slot :item="item" :index="i">{{ item }}</slot>\n    </li>\n  </ul>\n</template>',
    svelte:
      '<script>\nlet { items, children } = $props();\n</script>\n<ul data-part="list">\n  {#each items as item, i (item.id ?? i)}\n    <li data-part="item">{@render children(item)}</li>\n  {/each}\n</ul>',
  },
  nav: {
    description: "Navigation bar with links",
    vanilla: {
      html: '<nav data-part="nav">\n  <a data-part="link" href="{{ url }}" data-active="{{ isActive }}">{{ label }}</a>\n</nav>',
      css: '[data-part="nav"] { display: flex; gap: 0.4rem; padding: 0.4rem; }\n[data-part="link"] { padding: 0.6rem 1.2rem; color: var(--color-text); text-decoration: none; border-radius: 0.4rem; }\n[data-part="link"]:hover { background: var(--color-surface-raised); }\n[data-part="link"][data-active] { background: var(--color-accent); color: var(--color-accent-text); }',
    },
    react:
      'export function Nav({ links }) {\n  return (\n    <nav data-part="nav">\n      {links.map((link) => (\n        <a key={link.href} data-part="link" href={link.href} data-active={link.isActive ? "" : undefined}>\n          {link.label}\n        </a>\n      ))}\n    </nav>\n  );\n}',
    vue: '<script setup>\ndefineProps({ links: Array });\n</script>\n<template>\n  <nav data-part="nav">\n    <a v-for="link in links" :key="link.href" data-part="link" :href="link.href" :data-active="link.isActive ? \'\' : undefined">\n      {{ link.label }}\n    </a>\n  </nav>\n</template>',
    svelte:
      '<script>\nlet { links } = $props();\n</script>\n<nav data-part="nav">\n  {#each links as link}\n    <a data-part="link" href={link.href} data-active={link.isActive ? "" : undefined}>\n      {link.label}\n    </a>\n  {/each}\n</nav>',
  },
  "playwright-config": {
    description: "Playwright configuration file for a11y testing",
    vanilla: [
      "/**",
      " * FILE: playwright.config.js",
      " * USAGE: Shared Playwright config for rule-mcp AI projects",
      " * SCOPE: Chromium, a11y tests in tests/a11y/, dev server auto-start",
      " */",
      "",
      'import { defineConfig } from "@playwright/test";',
      "",
      "export default defineConfig({",
      '  testDir: "./tests/a11y",',
      "  fullyParallel: true,",
      "  forbidOnly: !!process.env.CI,",
      "  retries: process.env.CI ? 2 : 0,",
      "  workers: process.env.CI ? 1 : undefined,",
      '  reporter: "html",',
      "  use: {",
      '    baseURL: process.env.BASE_URL || "http://localhost:5173",',
      '    trace: "on-first-retry",',
      "  },",
      "  webServer: {",
      '    command: "pnpm dev",',
      "    port: 5173,",
      "    reuseExistingServer: !process.env.CI,",
      "  },",
      "});",
    ].join("\n"),
  },
  "a11y-test-basic": {
    description: "Basic page structure a11y tests (landmarks, headings, language, global axe)",
    vanilla: [
      "/**",
      " * @module tests/a11y/_basic.spec",
      " *",
      " * Basic a11y tests using Playwright + axe-core.",
      " * Tests: page landmarks, headings structure, language declaration, global violations.",
      " */",
      "",
      'import { test, expect } from "@playwright/test";',
      'import AxeBuilder from "@axe-core/playwright";',
      "",
      'test.describe("A11y: basic page structure", () => {',
      '  test("page has no auto-detected a11y violations", async ({ page }) => {',
      '    await page.goto("/");',
      "    const results = await new AxeBuilder({ page }).analyze();",
      "    expect(results.violations).toEqual([]);",
      "  });",
      "",
      '  test("page has exactly one <h1>", async ({ page }) => {',
      '    await page.goto("/");',
      '    await expect(page.locator("h1")).toHaveCount(1);',
      "  });",
      "",
      '  test("headings don\'t skip levels", async ({ page }) => {',
      '    await page.goto("/");',
      "    const levels = await page.evaluate(() =>",
      '      Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))',
      "        .map(h => parseInt(h.tagName[1], 10))",
      "    );",
      "    for (let i = 1; i < levels.length; i++) {",
      "      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);",
      "    }",
      "  });",
      "",
      '  test("page has <main> landmark", async ({ page }) => {',
      '    await page.goto("/");',
      '    await expect(page.locator("main")).toBeAttached();',
      "  });",
      "",
      '  test("html has lang attribute", async ({ page }) => {',
      '    await page.goto("/");',
      '    const lang = await page.locator("html").getAttribute("lang");',
      "    expect(lang).toBeTruthy();",
      "  });",
      "});",
    ].join("\n"),
  },
  "a11y-test-forms": {
    description: "Form a11y tests (labels, errors, required fields)",
    vanilla: [
      "/**",
      " * @module tests/a11y/_forms.spec",
      " *",
      " * Form a11y tests using Playwright + axe-core.",
      " * Tests: label associations, error messages, required fields.",
      " */",
      "",
      'import { test, expect } from "@playwright/test";',
      'import AxeBuilder from "@axe-core/playwright";',
      "",
      'test.describe("A11y: forms", () => {',
      '  test("form has no a11y violations on load", async ({ page }) => {',
      '    await page.goto("/");',
      "    const results = await new AxeBuilder({ page })",
      '      .include("form")',
      '      .withTags(["wcag2aa", "wcag21aa", "wcag22aa"])',
      "      .analyze();",
      "    expect(results.violations).toEqual([]);",
      "  });",
      "",
      '  test("no a11y violations after invalid form submission", async ({ page }) => {',
      '    await page.goto("/");',
      "    await page.locator(\"button[type='submit']\").click();",
      "    const results = await new AxeBuilder({ page }).analyze();",
      "    expect(results.violations).toEqual([]);",
      "  });",
      "});",
    ].join("\n"),
  },
  "a11y-test-components": {
    description: "Component-level a11y tests (custom elements, shadow DOM)",
    vanilla: [
      "/**",
      " * @module tests/a11y/_components.spec",
      " *",
      " * Component-level a11y tests using Playwright + axe-core.",
      " * Tests each custom element or component in isolation.",
      " */",
      "",
      'import { test, expect } from "@playwright/test";',
      'import AxeBuilder from "@axe-core/playwright";',
      "",
      'test.describe("A11y: components", () => {',
      '  test("each component has no a11y violations", async ({ page }) => {',
      '    await page.goto("/");',
      "",
      "    // Test each custom element on the page",
      '    const elements = ["todo-item", "app-root"];',
      "    for (const el of elements) {",
      "      const results = await new AxeBuilder({ page })",
      "        .include(el)",
      "        .analyze();",
      "      expect(results.violations).toEqual([]);",
      "    }",
      "  });",
      "});",
    ].join("\n"),
  },
};

/** Convert kebab-case or snake_case to PascalCase. */
export function toPascal(string_) {
  if (/^[A-Z][a-zA-Z0-9]*$/.test(string_)) {
    return string_;
  }

  // Split on separators AND on an internal capital, so camelCase keeps its
  // humps: "primaryButton" is PrimaryButton, not Primarybutton.
  return string_
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

/** Convert PascalCase to kebab-case. */
export function toKebab(string_) {
  return string_
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replaceAll(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/** Interpolate template variables. */
export function interpolate(template, variables) {
  return template.replaceAll(/\{\{\s*(\w[\w-]*)\s*\}\}/g, (match, key) => (variables[key] === undefined ? match : variables[key]));
}
