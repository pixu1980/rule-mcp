// @ts-check

/** @type {WeakSet<Function>} */
const registered = new WeakSet();

/**
 * Register a CSSStyleSheet via `document.adoptedStyleSheets` once per component class.
 * Guards against duplicate adoption on HMR restarts and multiple bundle entries.
 *
 * Accepts either a CSS string or a `CSSStyleSheet` instance. Strings are
 * compiled with `replaceSync`. Arrays are flattened.
 *
 * @param {Function} ElementClass
 * @param {string | CSSStyleSheet | Array<string | CSSStyleSheet>} input
 * @returns {void}
 */
export function registerStylesheet(ElementClass, input) {
  if (registered.has(ElementClass)) return;

  const items = Array.isArray(input) ? input : [input];
  const sheets = items.map((item) => {
    if (item instanceof CSSStyleSheet) return item;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(item);
    return sheet;
  });

  document.adoptedStyleSheets.push(...sheets);
  registered.add(ElementClass);
}

export default registerStylesheet;
