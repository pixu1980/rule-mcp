

// Pattern B: Functional Component

/** Guardrail `vanilla-fn-component`: Functional component is a plain function */
export const vanillaFnComponent = {
  id: "vanilla-fn-component",
  label: "Functional component is a plain function",
  description: "Pattern B components must be plain functions, NOT classes extending HTMLElement.",
  check: (code) => {
    const head = code.trim();
    const declaration = /^export\s+function\s+([A-Za-z0-9_$]+)/.exec(head) || /^function\s+([A-Za-z0-9_$]+)/.exec(head) || /^export\s+const\s+([A-Za-z0-9_$]+)/.exec(head);
    // PascalCase, because a plain declaration is not a component signature:
    // `DEFAULTS`, `helper` and `getSortedIncomes` all open a module with
    // `export const` or `export function` and none of them renders anything.
    const isPlainFunction = Boolean(declaration) && /^[A-Z]/.test(declaration[1]) && /[a-z]/.test(declaration[1]);
    const isClass = /extends\s+HTMLElement/.test(code);

    if (isClass) {
      return { pass: true, note: "This is a Pattern A (CE). Pattern B check not applicable." };
    }

    if (!isPlainFunction) {
      return { pass: true, note: "Not a Pattern B component - skipping" };
    }

    // An arrow with an expression body returns the template without a `return`
    // keyword, so `export const App = () => html`` is Pattern B too.
    const isReturnsHtml = /return\s+html`/.test(code) || /=>\s*(?:\([^)]*\)\s*)?html`/.test(code);

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
