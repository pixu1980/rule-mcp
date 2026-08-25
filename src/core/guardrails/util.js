// Auto-split from src/core/guardrail-defs.js - see ./index.js
export function extractRealCSS(code, context = {}) {
  const cssBlocks = [];

  // If this is a CSS file, the entire content is CSS
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

  return cssBlocks.join("\n\n");
}
