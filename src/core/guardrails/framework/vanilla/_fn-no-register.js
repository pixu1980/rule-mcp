/** Guardrail `vanilla-fn-no-register`: Functional component does NOT call customElements.define */
export const vanillaFnNoRegister = {
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
};
