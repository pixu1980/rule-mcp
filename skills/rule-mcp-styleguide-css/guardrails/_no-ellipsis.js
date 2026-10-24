

/** Guardrail `css-no-ellipsis`: Prose wraps, it is never truncated */
export const cssNoEllipsis = {
  id: "css-no-ellipsis",
  label: "Prose wraps, it is never truncated",
  description:
    "A label is cut with text-overflow: ellipsis, or clamped with -webkit-line-clamp, and its end disappears. The reader cannot identify a name it cannot read, and the width a truncation saves is width the layout already has. Wrap instead.",
  check: (code, context) => {
    const { extractRealCSS } = context.helpers;
    const css = extractRealCSS(code, context);
    const patterns = [/text-overflow\s*:\s*ellipsis/gi, /(?:-webkit-)?line-clamp\s*:\s*\d+/gi];
    const hits = patterns.flatMap((pattern) => [...css.matchAll(pattern)].map((match) => match[0]));

    if (hits.length === 0) {
      return { pass: true, note: "No truncation found" };
    }

    return {
      pass: false,
      failCount: hits.length,
      detail: hits.slice(0, 10),
      suggestion: "Drop the truncation and let the label wrap: white-space: normal with overflow-wrap: anywhere, and no line clamp.",
    };
  },
};
