/** Guardrail `a11y-test-required`: Playwright + axe-core a11y tests */
import { maskLiterals } from "@rule-mcp/sdk";

export const a11yTestRequired = {
  id: "a11y-test-required",
  label: "Playwright + axe-core a11y tests",
  description:
    "Every project MUST have automated a11y tests using Playwright and @axe-core/playwright. Tests must live in tests/a11y/ and must include an axe-core scan with expect(results.violations).toEqual([]).",
  check: (code, context) => {
    const isTestFile = context?.fileName?.includes(".spec.") || context?.fileName?.includes(".test.") || context?.mode === "test";
    const hasAxeImport = /@axe-core\/playwright/.test(code) || /from\s+['"]@axe-core\/playwright['"]/.test(code);
    const hasAxeBuilder = /new\s+AxeBuilder/.test(code) || /AxeBuilder/.test(code);
    const hasViolationCheck = /\.violations\s*\.toEqual/.test(code) || /expect\(.*\.violations\)/.test(code);
    const hasPlaywright = /from\s+['"]@playwright\/test['"]/.test(code);
    // Read from code, not from prose: a prompt registry that mentions
    // "playwright.config" in a description is not a Playwright project.
    const hasPlaywrightConfig = /playwright\.config/.test(
      maskLiterals(code)
        .replaceAll(/\/\*[\s\S]*?\*\//g, "")
        .replaceAll(/(?:^|[^:])\/\/.*$/gm, ""),
    );

    // A module with no markup and no component role cannot carry a UI test:
    // asking a telemetry module for a Playwright import is noise, and noise
    // is how a rule teaches people to stop reading its output (F-A1).
    // Comments are not markup: a JSDoc `{ReturnType<typeof f>}` used to read
    // as a UI and pulled a Playwright requirement into a prompt registry.
    const codeOnly = maskLiterals(code)
      .replaceAll(/\/\*[\s\S]*?\*\//g, "")
      .replaceAll(/(?:^|[^:])\/\/.*$/gm, "");
    const looksLikeUi = context?.isComponent === true || /<[A-Za-z][^>]*>/.test(codeOnly) || /\.(jsx|tsx|vue|svelte)$/.test(context?.fileName ?? "");
    if (!isTestFile && !looksLikeUi && !hasPlaywrightConfig) {
      return { pass: true, note: "No UI surface in this file, skipping" };
    }

    const details = [];
    if (!hasPlaywright && !isTestFile) {
      details.push("No @playwright/test import");
    }
    if (!hasAxeImport) {
      details.push("No @axe-core/playwright import");
    }
    if (!hasAxeBuilder) {
      details.push("No AxeBuilder usage");
    }
    if (!hasViolationCheck) {
      details.push("No violation assertion (expect(results.violations).toEqual([]))");
    }

    if (context?.mode === "scaffold" || context?.fileName === "playwright.config.js") {
      const isConfigValid = hasPlaywrightConfig || (hasPlaywright && hasAxeImport);

      return {
        pass: isConfigValid,
        failCount: isConfigValid ? 0 : 1,
        detail: ["Missing playwright.config.js or @axe-core/playwright dependency"],
        suggestion: "Create playwright.config.js and install: pnpm install --save-dev playwright @axe-core/playwright",
      };
    }

    if (isTestFile || hasPlaywright || hasAxeImport) {
      const failCount = details.length;

      return {
        pass: failCount === 0,
        failCount,
        detail: details,
        suggestion:
          failCount === 0
            ? ""
            : "Add the missing a11y test infrastructure: import AxeBuilder from @axe-core/playwright, run new AxeBuilder({ page }).analyze(), and assert expect(results.violations).toEqual([]).",
      };
    }

    return { pass: true, note: "Not a test file, skipping a11y test check" };
  },
};
