/**
 * @module hooks/useAdoptedStylesheet
 *
 * Adopts a component's external CSS (imported as raw text via Vite's
 * `?raw` suffix) onto `document.adoptedStyleSheets` exactly once per
 * unique stylesheet, regardless of how many component instances mount.
 * This is the React equivalent of the `adoptedStyleSheets` pattern used by
 * rule-mcp vanilla/web-component examples, keeping every rule in an external
 * `.css` file with zero CSS-in-JS and zero inline styles.
 */

import { useEffect } from "react";

const adoptedSheets = new Map<string, CSSStyleSheet>();

/**
 * Returns a cached {@link CSSStyleSheet} for the given CSS text, creating it
 * on first use.
 */
function getSheet(cssText: string): CSSStyleSheet {
  let sheet = adoptedSheets.get(cssText);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    adoptedSheets.set(cssText, sheet);
  }
  return sheet;
}

/**
 * Adopts `cssText` onto the document once. Safe to call from every
 * component instance — the underlying `CSSStyleSheet` is cached and only
 * appended to `document.adoptedStyleSheets` the first time it is seen.
 *
 * @param cssText - raw CSS source, typically from `import css from
 * "./_Component.css?raw"`.
 */
export function useAdoptedStylesheet(cssText: string): void {
  useEffect(() => {
    const sheet = getSheet(cssText);
    if (!document.adoptedStyleSheets.includes(sheet)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  }, [cssText]);
}
