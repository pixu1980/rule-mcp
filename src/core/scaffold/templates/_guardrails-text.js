

/** @module core/scaffold/templates/guardrails-text */

export function buildGuardrailsText() {
  const lines = [
    "# Component Guardrails",
    "",
    "## Shared (all components)",
    "- [ ] **no-css-classes**: CSS uses element + [data-part] selectors only. No .class rules.",
    "- [ ] **no-inline-styles**: Template has no style=... attributes.",
    "- [ ] **semantic-html**: No <div> where semantic element exists.",
    "- [ ] **external-css**: CSS loaded externally (adoptedStyleSheets or framework-native).",
    "- [ ] **data-part-naming**: Child elements have data-part=role attributes.",
    "- [ ] **element-attr-selectors**: CSS uses element or [data-part=] only.",
    "- [ ] **file-naming**: File is _PascalCase.ext. Folder is PascalCase/. Barrel: index.js.",
    "",
    "## A11y Testing (MANDATORY)",
    "- [ ] **a11y-test-basic**: tests/a11y/_basic.spec.js - page structure, headings, landmarks",
    "- [ ] **a11y-test-forms**: tests/a11y/_forms.spec.js - form inputs, labels, errors",
    "- [ ] **a11y-test-components**: tests/a11y/_components.spec.js - per-component a11y checks",
    "- [ ] **playwright-config**: playwright.config.js with Chromium target",
    "",
    "Use /rule-area-styleguide and /rule-persona-a11y for a11y test templates and audits.",
    "Use rule_tool_check for automated validation.",
    "Iterate: generate, rule_tool_check, fix, rule_tool_check, all pass.",
  ];

  return lines.join("\n");
}
