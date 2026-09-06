// Auto-split from src/core/guardrails/quality.js - see ./quality/index.js
/** CSS extraction helpers used by the layout/quality checks. */
function extractRealCSS(code, context = {}) {
  const cssBlocks = [];

  if (context?.fileName && /\.css$/i.test(context.fileName)) {
    return code;
  }

  const fencedCss = code.match(/```css\n([\s\S]*?)```/g);
  if (fencedCss) {
    cssBlocks.push(...fencedCss.map((c) => c.replaceAll(/```css\n|```/g, "").trim()));
  }

  const sheetCss = code.match(/CSSStyleSheet\.replaceSync\(`([\s\S]*?)`\)/g);
  if (sheetCss) {
    cssBlocks.push(...sheetCss.map((c) => c.match(/`([\s\S]*?)`/)?.[1] || "").filter(Boolean));
  }

  const styleBlocks = code.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
  if (styleBlocks) {
    cssBlocks.push(...styleBlocks.map((c) => c.replaceAll(/<style[^>]*>|<\/style>/g, "").trim()));
  }

  if (cssBlocks.length === 0 && looksLikeStylesheet(code)) {
    return code;
  }

  return cssBlocks.join("\n\n");
}

/** Whether a body of text is a stylesheet in its own right. */
function looksLikeStylesheet(code) {
  const hasRule = /(?:^|[};])\s*[^{};@]*[\w\]*)]?\s*\{[^{}]*[a-z-]+\s*:\s*[^{}]+[;}]/i.test(code);
  if (!hasRule) {
    return false;
  }
  const isProgram = /\b(?:function|=>|import\s|export\s|const\s|let\s|var\s|return\s|class\s)/.test(code);
  const isMarkup = /<\/?[a-z][\w-]*(?:\s[^<>]*)?>/i.test(code);

  return !isProgram && !isMarkup;
}

/** Selectors that declare a grid without a stated justification. */
function unjustifiedGrids(css) {
  const BLOCK_SIGNALS = [
    /grid-template-areas\s*:/i,
    /subgrid/i,
    /grid-auto-flow\s*:/i,
    /repeat\(\s*auto-(?:fit|fill)/i,
  ];
  const placesItems = /(?:^|[\s;{])grid-(?:area|column|row)(?:-start|-end)?\s*:/i.test(css);
  const offenders = [];

  for (const match of css.matchAll(/display\s*:\s*(?:inline-)?grid\b/gi)) {
    const at = match.index;
    const open = css.lastIndexOf("{", at);
    if (open === -1) {
      continue;
    }
    const close = css.indexOf("}", at);
    const body = css.slice(open + 1, close === -1 ? css.length : close);
    const previous = Math.max(css.lastIndexOf("}", open), css.lastIndexOf("{", open - 1));
    const head = css.slice(previous + 1, open);
    const stated = /\/\*[^*]*\bgrid\s*:/i.test(head);
    if (stated || placesItems || BLOCK_SIGNALS.some((re) => re.test(body))) {
      continue;
    }
    const selector = head
      .replaceAll(/\/\*[\s\S]*?\*\//g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();
    offenders.push(selector || "(unnamed rule)");
  }

  return offenders;
}

// ─── Accessibility guardrails

export { extractRealCSS, looksLikeStylesheet, unjustifiedGrids };
