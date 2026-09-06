// Auto-split from src/core/guardrails/framework.js - see ./framework/index.js

export const VANILLA_REACTIVE_PART1 = [
  // Pattern A: Custom Element + html``
  {
    id: "vanilla-ce-extends",
    label: "Custom Element extends HTMLElement",
    description: "Pattern A components must extend HTMLElement with a static {} block for customElements.define().",
    check: (code) => {
      const isExtendsHtmlelement = /extends\s+HTMLElement/.test(code);
      const hasStaticBlock = /static\s*\{/.test(code) && /customElements\.define\(/.test(code);
      const hasVrComponent = /vrComponent\(/.test(code);
      const isClass = /^export\s+class\s/.test(code.trim()) || /^class\s/.test(code.trim());

      if (!isClass) {
        return { pass: true, note: "Not a class - skipping Pattern A check" };
      }

      if (isExtendsHtmlelement && (hasStaticBlock || hasVrComponent)) {
        return { pass: true };
      }

      const failures = [];

      if (!isExtendsHtmlelement) {
        failures.push("Must extend HTMLElement");
      }

      if (!hasStaticBlock && !hasVrComponent) {
        failures.push("Must have static {} block with vrComponent() or customElements.define()");
      }

      return {
        pass: false,
        failCount: failures.length,
        detail: failures,
        suggestion: "Add: static { vrComponent(this, { tag: 'my-component', css: import.meta.url }); }",
      };
    },
  },
  {
    id: "vanilla-html-template",
    label: "Component uses html`` tagged template",
    description: "Pattern A and B components must return html`` (TemplateResult) for their template.",
    check: (code) => {
      const isUsesHtml = /html`/.test(code);
      const isFunction =
        /^export\s+function\s/.test(code.trim()) || /^function\s/.test(code.trim()) || /=>\s*\{/.test(code);
      const isCe = /extends\s+HTMLElement/.test(code);

      if (!isFunction && !isCe) {
        return { pass: true, note: "Not a component \u{2014} skipping" };
      }

      if (!isUsesHtml) {
        return {
          pass: false,
          failCount: 1,
          detail: ["No html`` found"],
          suggestion: "Use html`` tagged template for the template.",
        };
      }

      return { pass: true };
    },
  },
  {
    id: "vanilla-mount-guard",
    label: "connectedCallback has re-mount guard",
    description: "Pattern A connectedCallback must check _isMounted to prevent double-mounting.",
    check: (code) => {
      if (!code.includes("connectedCallback")) {
        return { pass: true, note: "No connectedCallback - skipping" };
      }

      const hasGuard = /_isMounted/.test(code) || /_pixBound/.test(code) || /bindElement/.test(code);

      if (hasGuard) {
        return { pass: true };
      }

      return {
        pass: false,
        failCount: 1,
        detail: ["No re-mount guard found"],
        suggestion: "Add: if (this._isMounted) return; this._isMounted = true; at start of connectedCallback().",
      };
    },
  },
  {
    id: "vanilla-adopted-stylesheets",
    label: "CSS via adoptedStyleSheets in static {} block",
    description:
      "Pattern CEs must load external CSS via fetch(`.css`).text() → CSSStyleSheet.replaceSync() → adoptedStyleSheets.",
    check: (code) => {
      const hasCssFetch = /CSSStyleSheet/.test(code) && /replaceSync/.test(code) && /adoptedStyleSheets/.test(code);
      const isCe = /extends\s+HTMLElement/.test(code);

      if (!isCe) {
        return { pass: true, note: "Not a CE - skipping" };
      }

      if (hasCssFetch) {
        return { pass: true };
      }

      const isNoFetch = /\.css['"]/.test(code) && !code.includes("CSSStyleSheet");

      if (isNoFetch) {
        return {
          pass: false,
          failCount: 1,
          detail: ["CSS file referenced but not loaded via adoptedStyleSheets"],
          suggestion:
            "Use: const cssText = await (await fetch(new URL('./_Comp.css', import.meta.url))).text(); const sheet = new CSSStyleSheet(); sheet.replaceSync(cssText);",
        };
      }

      return { pass: true, note: "No CSS detected - skipping" };
    },
  },

  // Pattern B: Functional Component
  {
    id: "vanilla-fn-component",
    label: "Functional component is a plain function",
    description: "Pattern B components must be plain functions, NOT classes extending HTMLElement.",
    check: (code) => {
      const isPlainFunction =
        /^export\s+function\s/.test(code.trim()) ||
        /^function\s/.test(code.trim()) ||
        /^export\s+const\s/.test(code.trim());
      const isClass = /extends\s+HTMLElement/.test(code);

      if (isClass) {
        return { pass: true, note: "This is a Pattern A (CE). Pattern B check not applicable." };
      }

      if (!isPlainFunction) {
        return { pass: true, note: "Not a Pattern B component - skipping" };
      }

      const isReturnsHtml = /return\s+html`/.test(code);

      if (!isReturnsHtml) {
        return {
          pass: false,
          failCount: 1,
          detail: ["Function does not return html``"],
          suggestion: "Add: return html`...`; at the end of the function.",
        };
      }

      return { pass: true };
    },
  },];
