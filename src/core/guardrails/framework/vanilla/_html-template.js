/** Guardrail `vanilla-html-template`: Component uses html`` tagged template */
export const vanillaHtmlTemplate = {
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
};
