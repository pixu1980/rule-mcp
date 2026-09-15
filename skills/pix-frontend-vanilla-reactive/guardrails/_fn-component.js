

// Pattern B: Functional Component

/** Guardrail `vanilla-fn-component`: Functional component is a plain function */
export const vanillaFnComponent = {
  id: "vanilla-fn-component",
  label: "Functional component is a plain function",
  description: "Pattern B components must be plain functions, NOT classes extending HTMLElement.",
  check: (code) => {
    const isPlainFunction = /^export\s+function\s/.test(code.trim()) || /^function\s/.test(code.trim()) || /^export\s+const\s/.test(code.trim());
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
};
