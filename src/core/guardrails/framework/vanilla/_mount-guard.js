

/** Guardrail `vanilla-mount-guard`: connectedCallback has re-mount guard */
export const vanillaMountGuard = {
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
};
