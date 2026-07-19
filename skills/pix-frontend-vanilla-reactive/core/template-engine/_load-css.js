// ═══════════════════════════════════════════════════════════════════════════════
//  Helper: load external CSS file via fetch + CSSStyleSheet
//  ═══════════════════════════════════════════════════════════════════════════════
//  Usage:
//    await loadCSS(new URL('./_App.css', import.meta.url));   // explicit URL
//    await loadCSS('./_App.css');                              // relative path
//
//  Used internally by vrComponent for css: import.meta.url.
//  Also available standalone for Pattern B (no vrComponent).
//  Adds the sheet to document.adoptedStyleSheets (no Shadow DOM).
//  ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch a CSS file and adopt it into document.adoptedStyleSheets.
 *
 * @param {string|URL} url - URL path (relative) or URL object
 * @returns {Promise<CSSStyleSheet>}
 */
'use strict';
export async function loadCSS(url) {
  const resolved = typeof url === 'string' ? new URL(url) : url;
  const text = await (await fetch(resolved)).text();
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  return sheet;
}
