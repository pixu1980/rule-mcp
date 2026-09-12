// Pattern A: Custom Element + html``

/** Guardrail `vanilla-ce-extends`: Custom Element extends HTMLElement */
export const vanillaCeExtends = {
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
};
