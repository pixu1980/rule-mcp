// @ts-check

/**
 * Map a built-in tag to its corresponding HTMLxxxElement class name.
 *
 * @param {string} tag
 * @returns {string}
 */
export const extendsElementToHTMLClass = (tag) => {
  /** @type {Record<string, string>} */
  const overrides = {
    a: "HTMLAnchorElement",
    blockquote: "HTMLQuoteElement",
    button: "HTMLButtonElement",
    details: "HTMLDetailsElement",
    dialog: "HTMLDialogElement",
    div: "HTMLDivElement",
    form: "HTMLFormElement",
    img: "HTMLImageElement",
    input: "HTMLInputElement",
    label: "HTMLLabelElement",
    li: "HTMLLIElement",
    ol: "HTMLOListElement",
    p: "HTMLParagraphElement",
    select: "HTMLSelectElement",
    span: "HTMLSpanElement",
    table: "HTMLTableElement",
    textarea: "HTMLTextAreaElement",
    ul: "HTMLUListElement",
  };

  if (overrides[tag]) return overrides[tag];

  return `HTML${tag.charAt(0).toUpperCase()}${tag.slice(1)}Element`;
};
