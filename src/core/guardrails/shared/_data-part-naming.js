import { maskLiterals } from "../_util.js";

/** Guardrail `data-part-naming`: data-part attribute for child elements */
export const dataPartNaming = {
  id: "data-part-naming",
  label: "data-part attribute for child elements",
  description: 'Component child elements with semantic roles must use data-part="role" attributes.',
  check: (rawCode) => {
    // Markup inside a string is a sample a generator emits, not markup this
    // file renders: a template catalog was being told to add data-part to
    // the examples it quotes (finding F-A1).
    const code = maskLiterals(rawCode);
    const hasDataPart = code.includes('data-part="');
    const hasChildren = code.includes("<div") || code.includes("<section") || code.includes("<header") || code.includes("<nav");

    if (!hasChildren) {
      return { pass: true, note: "No child elements found" };
    }

    return {
      pass: hasDataPart,
      failCount: hasDataPart ? 0 : 1,
      suggestion: 'Add data-part="role" attributes to child elements: <section data-part="list">, <button data-part="delete">.',
    };
  },
};
