/** Guardrail `css-comments-required`: CSS file-level comments */
export const cssCommentsRequired = {
  id: "css-comments-required",
  label: "CSS file-level comments",
  description: "Every CSS file must start with a file-level comment describing its purpose, scope, and usage. Sections should be separated by comment headers.",
  check: (code, context) => {
    // Only check CSS files or files with explicit CSS blocks
    const isCssFile = context?.fileName && /\.css$/i.test(context.fileName);
    const hasCssBlock = /```css|CSSStyleSheet|<style[^>]*>/i.test(code);
    if (!isCssFile && !hasCssBlock) {
      return { pass: true, note: "Not a CSS file and no CSS block detected, skipping" };
    }
    // Single char before the brace: `[\w-]+` re-scans the whole run at every
    // start position on brace-less input (quadratic on a long line).
    //
    // `]` and `)` belong in that class: `[data-part="card"] {` is the
    // selector this styleguide asks everyone to write, and a probe that
    // accepts only word characters skips every stylesheet that follows it.
    const hasCSSRules = /[\w)\]-]\s*\{/.test(code);
    if (!hasCSSRules) {
      return { pass: true, note: "No CSS rules detected, skipping" };
    }

    const trimmed = code.trimStart();
    const hasFileComment = /\/\*\*\s*\n/.test(trimmed) || /\/\*\s*FILE:/i.test(trimmed) || /\/\*\s*USAGE:/i.test(trimmed) || /\/\*\s*SCOPE:/i.test(trimmed);
    if (!hasFileComment) {
      return {
        pass: false,
        failCount: 1,
        detail: ["Missing file-level comment"],
        suggestion: "Add a file-level comment at the top: /**\n * FILE: _Component.css\n * USAGE: Styles for ComponentName\n * SCOPE: selector\n */",
      };
    }

    const lines = code.split("\n").filter((l) => l.trim());
    if (lines.length > 30) {
      const sectionComments = code.match(/\/\*\s*─{2,}/g) || code.match(/\/\*\s*[A-Z]/g) || [];
      if (sectionComments.length < 2) {
        return {
          pass: false,
          failCount: 1,
          detail: ["Missing section comments in a file with >30 lines"],
          suggestion: "Add section comment headers (/* ─── Layout ─── */) for each logical group of rules.",
        };
      }
    }

    return { pass: true, note: "CSS file-level comment and section comments present" };
  },
};
