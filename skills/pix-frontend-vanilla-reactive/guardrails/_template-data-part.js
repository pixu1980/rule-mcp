

/** Guardrail `vanilla-template-data-part`: External templates use data-part selectors */
export const vanillaTemplateDataPart = {
  id: "vanilla-template-data-part",
  label: "External templates use data-part selectors",
  description: '.template.html files must use data-part="role" attributes, not CSS class names.',
  check: (code, context) => {
    const isTemplate = context?.fileName?.endsWith(".template.html") || false;

    if (!isTemplate) {
      return { pass: true, note: "Not a template file - skipping" };
    }

    const classAttributes = code.match(/class\s*=\s*["'][^"']*["']/g);
    const dataPart = code.match(/data-part\s*=\s*["']/g);

    if (classAttributes && (!dataPart || classAttributes.length > dataPart.length)) {
      return {
        pass: false,
        failCount: classAttributes.length,
        detail: (classAttributes || []).slice(0, 5),
        suggestion: 'Replace class="..." with data-part="role" attributes.',
      };
    }

    return { pass: true };
  },
};
