

/** Guardrail `vanilla-template-load`: Template loaded via fetch or bundle-text */
export const vanillaTemplateLoad = {
  id: "vanilla-template-load",
  label: "Template loaded via fetch or bundle-text",
  description: "Pattern C templates must be loaded via fetch() at runtime or bundle-text: import at build time.",
  check: (code) => {
    const hasFetch = /fetch\(/.test(code) && /\.template\.html/.test(code);
    const hasBundleImport = /bundle-text:/.test(code) && /\.template\.html/.test(code);
    const isCe = /extends\s+HTMLElement/.test(code);

    if (!isCe) {
      return { pass: true, note: "Not a CE - skipping" };
    }

    const hasHtmlCall = /html\(/.test(code) && /\.template\.html/.test(code);

    if (hasHtmlCall && (hasFetch || hasBundleImport)) {
      return { pass: true };
    }

    if (hasHtmlCall && !hasFetch && !hasBundleImport) {
      return {
        pass: false,
        failCount: 1,
        detail: ["html() used with template but no fetch/import"],
        suggestion: "Add: const templateStr = await (await fetch(new URL('./_Comp.template.html', import.meta.url))).text();",
      };
    }

    return { pass: true, note: "No Pattern C detection needed - skipping" };
  },
};
