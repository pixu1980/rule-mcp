

/** Guardrail `vanilla-adopted-stylesheets`: CSS via adoptedStyleSheets in static {} block */
export const vanillaAdoptedStylesheets = {
  id: "vanilla-adopted-stylesheets",
  label: "CSS via adoptedStyleSheets in static {} block",
  description: "Pattern CEs must load external CSS via fetch(`.css`).text() → CSSStyleSheet.replaceSync() → adoptedStyleSheets.",
  check: (code) => {
    const hasCssFetch = /CSSStyleSheet/.test(code) && /replaceSync/.test(code) && /adoptedStyleSheets/.test(code);
    const isCe = /extends\s+HTMLElement/.test(code);

    if (!isCe) {
      return { pass: true, note: "Not a CE - skipping" };
    }

    if (hasCssFetch) {
      return { pass: true };
    }

    const isNoFetch = /\.css['"]/.test(code) && !code.includes("CSSStyleSheet");

    if (isNoFetch) {
      return {
        pass: false,
        failCount: 1,
        detail: ["CSS file referenced but not loaded via adoptedStyleSheets"],
        suggestion: "Use: const cssText = await (await fetch(new URL('./_Comp.css', import.meta.url))).text(); const sheet = new CSSStyleSheet(); sheet.replaceSync(cssText);",
      };
    }

    return { pass: true, note: "No CSS detected - skipping" };
  },
};
