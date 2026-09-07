/** Guardrail `no-inline-styles`: Zero inline styles in templates */
export const noInlineStyles = {
  id: "no-inline-styles",
  label: "Zero inline styles in templates",
  description: 'Templates must not use style="..." attributes or JSX style={{...}} objects. All styling in external CSS files.',
  check: (code) => {
    const inlineAttributes = code.match(/style\s*=\s*"[^"]*"/g) || [];
    const inlineSingle = code.match(/style\s*=\s*'[^']*'/g) || [];
    // JSX/TSX: style={{...}} (React, Solid)
    const jsxStyle = code.match(/style\s*=\s*\{\{[^}]*\}\}/g) || [];
    inlineAttributes.push(...inlineSingle, ...jsxStyle);

    if (inlineAttributes.length === 0) {
      return { pass: true, note: "No inline style attributes found" };
    }

    const exceptions = code.match(/accent-option|contextmenu|context-menu/g);
    const effective = inlineAttributes.filter((a) => !exceptions || exceptions.every((e) => !a.includes(e)));

    return {
      pass: effective.length === 0,
      failCount: effective.length,
      detail: effective.slice(0, 10),
      suggestion: "Move styles to external .css file and use data-* attributes for dynamic values.",
    };
  },
};
