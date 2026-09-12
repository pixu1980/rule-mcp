import { extractRealCSS } from "../../../src/core/guardrails/_util.js";

/** Guardrail `no-css-classes`: Zero CSS classes in stylesheets */
export const noCssClasses = {
  id: "no-css-classes",
  label: "Zero CSS classes in stylesheets",
  description: "CSS must use only element selectors + [data-part] + [data-*] attribute selectors. No .class selectors (including pseudo-classes and combinators).",
  check: (code, context) => {
    const cssBlock = extractRealCSS(code, context);

    if (!cssBlock) {
      return { pass: true, note: "No CSS block found, skipping" };
    }
    // Match class selectors including: .foo, .foo:hover, .foo > span, .foo.bar, .foo::before
    const classRules = cssBlock.match(/^\s*\.[a-zA-Z][\w-]*(?:\s*[{,:.\s>+~])/gm);

    return {
      pass: !classRules || classRules.length === 0,
      failCount: classRules?.length || 0,
      detail: classRules ? classRules.slice(0, 10).map((s) => s.trim()) : [],
      suggestion: 'Replace .class selectors with element selectors or [data-part="..."] attribute selectors.',
    };
  },
};
