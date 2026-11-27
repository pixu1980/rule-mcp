/**
 * Labeled pairs for the newer rule-styleguide-a11y rules.
 *
 * `guardrail-corpus.mjs` is at its size ceiling, so the pairs for the a11y
 * rules added after it filled up live here and the accuracy fixture reads both.
 * Each entry is judged on its target rule alone.
 */

const A11Y = "rule-styleguide-a11y";

/** @type {Array<{rule: string, skill: string, label: "good"|"bad", fileName?: string, why: string, code: string}>} */
export const A11Y_CORPUS = [
  {
    rule: "a11y-role-button-focusable",
    skill: A11Y,
    label: "bad",
    fileName: "toolbar.html",
    why: "a role=button that Tab never reaches is a button only a mouse can press",
    code: `<div role="button">Save</div>\n`,
  },
  {
    rule: "a11y-role-button-focusable",
    skill: A11Y,
    label: "good",
    fileName: "toolbar.html",
    why: "tabindex puts the custom button in the tab order",
    code: `<div role="button" tabindex="0">Save</div>\n`,
  },
  {
    rule: "a11y-button-name",
    skill: A11Y,
    label: "bad",
    fileName: "toolbar.html",
    why: 'an icon-only button is announced as just "button"',
    code: `<button type="button"><svg viewBox="0 0 16 16"></svg></button>\n`,
  },
  {
    rule: "a11y-button-name",
    skill: A11Y,
    label: "good",
    fileName: "toolbar.html",
    why: "aria-label gives the icon-only button a name",
    code: `<button type="button" aria-label="Close"><svg viewBox="0 0 16 16"></svg></button>\n`,
  },
];
