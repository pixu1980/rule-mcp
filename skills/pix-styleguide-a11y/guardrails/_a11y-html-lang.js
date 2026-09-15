/** Guardrail `a11y-html-lang`: The page declares its language. */
import { a11yRule } from "./_a11y-helpers.js";

export const a11yHtmlLang = a11yRule({
  id: "a11y-html-lang",
  wcag: "3.1.1",
  label: "The page declares its language",
  description: "Without lang, a screen reader picks a voice by guess and pronounces the page in the wrong language.",
  suggestion: 'Add lang="..." to the html element',
  find: (code) => [...code.matchAll(/<html\b[^>]*>/gi)].map((m) => m[0]).filter((tag) => !/\blang\s*=/i.test(tag)),
});
