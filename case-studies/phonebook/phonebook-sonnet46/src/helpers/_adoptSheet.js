/**
 * @file src/helpers/_adoptSheet.js
 * @description Adopts a CSSStyleSheet to the document exactly once.
 * Safe to call from multiple component instances sharing the same sheet reference.
 */

/**
 * Adopts a CSSStyleSheet to document.adoptedStyleSheets.
 * Checks for duplicates before mutating the array.
 * @param {CSSStyleSheet} sheet
 */
export function adoptSheet(sheet) {
  if (!document.adoptedStyleSheets.includes(sheet)) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
}
