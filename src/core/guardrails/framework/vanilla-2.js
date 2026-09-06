// Auto-split from src/core/guardrails/framework.js - see ./framework/index.js

export const VANILLA_REACTIVE_PART2 = [
  {
    id: "vanilla-fn-no-register",
    label: "Functional component does NOT call customElements.define",
    description:
      "Pattern B functions must NOT register themselves as custom elements. That is the parent CE's responsibility.",
    check: (code) => {
      const isPlainFunction = /^export\s+function\s/.test(code.trim()) || /^function\s/.test(code.trim());

      if (!isPlainFunction) {
        return { pass: true, note: "Not a functional component - skipping" };
      }

      const hasDefine = /customElements\.define\(/.test(code);

      if (hasDefine) {
        return {
          pass: false,
          failCount: 1,
          detail: ["Functional component calls customElements.define()"],
          suggestion:
            "Remove customElements.define() from functional components. Register in the parent CE's static {} block.",
        };
      }

      return { pass: true };
    },
  },

  // Pattern C: External HTML Template
  {
    id: "vanilla-no-dollar-braces",
    label: "External templates do NOT contain ${} closures",
    description: ".template.html files can only use {{ }}, <for>, <if>, and @action. No ${} closures.",
    check: (code, context) => {
      const isTemplate = context?.fileName?.endsWith(".template.html") || false;
      const hasDollarBraces = /\${[^}]+\}/.test(code);

      if (!isTemplate && hasDollarBraces) {
        return { pass: true, note: "Not a .template.html file - ${} is valid here" };
      }

      if (isTemplate && hasDollarBraces) {
        return {
          pass: false,
          failCount: 1,
          detail: ["${} found in external template"],
          suggestion: 'Replace ${} closures with @click="handler" and use {{ expr }} for data expressions.',
        };
      }

      return { pass: true };
    },
  },
  {
    id: "vanilla-template-data-part",
    label: "External templates use data-part selectors",
    description: '.template.html files must use data-part="role" attributes, not CSS class names.',
    check: (code, context) => {
      const isTemplate = context?.fileName?.endsWith(".template.html") || false;

      if (!isTemplate) {
        return { pass: true, note: "Not a template file - skipping" };
      }

      const classAttributes = code.match(/class\s*=\s*["'][^"']*["']/g);
      const dataPart = code.match(/data-part\s*=\s*["']/g);

      if (classAttributes && (!dataPart || classAttributes.length > dataPart.length)) {
        return {
          pass: false,
          failCount: classAttributes.length,
          detail: (classAttributes || []).slice(0, 5),
          suggestion: 'Replace class="..." with data-part="role" attributes.',
        };
      }

      return { pass: true };
    },
  },
  {
    id: "vanilla-template-load",
    label: "Template loaded via fetch or bundle-text",
    description: "Pattern C templates must be loaded via fetch() at runtime or bundle-text: import at build time.",
    check: (code) => {
      const hasFetch = /fetch\(/.test(code) && /\.template\.html/.test(code);
      const hasBundleImport = /bundle-text:/.test(code) && /\.template\.html/.test(code);
      const isCe = /extends\s+HTMLElement/.test(code);

      if (!isCe) {
        return { pass: true, note: "Not a CE - skipping" };
      }

      const hasHtmlCall = /html\(/.test(code) && /\.template\.html/.test(code);

      if (hasHtmlCall && (hasFetch || hasBundleImport)) {
        return { pass: true };
      }

      if (hasHtmlCall && !hasFetch && !hasBundleImport) {
        return {
          pass: false,
          failCount: 1,
          detail: ["html() used with template but no fetch/import"],
          suggestion:
            "Add: const templateStr = await (await fetch(new URL('./_Comp.template.html', import.meta.url))).text();",
        };
      }

      return { pass: true, note: "No Pattern C detection needed - skipping" };
    },
  },];
