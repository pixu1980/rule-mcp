

/** Guardrail `vanilla-html-template`: Component uses html`` tagged template */
export const vanillaHtmlTemplate = {
  id: "vanilla-html-template",
  label: "Component uses html`` tagged template",
  description: "Pattern A and B components must return html`` (TemplateResult) for their template.",
  check: (code) => {
    const isUsesHtml = /html`/.test(code);
    // Line-anchored on purpose. A block-body arrow (`(row) => {`) appears in
    // stores, data files and helpers, so testing the whole body for one cannot
    // tell a component from any module that happens to hold a callback: it made
    // `_store.js` fail for carrying two `.sort((a, b) => {})` comparators.
    // The shape now matches `vanilla-fn-component`.
    const isFunction = /^export\s+function\s/.test(code.trim()) || /^function\s/.test(code.trim());
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
};
