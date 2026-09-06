// Pattern C: External HTML Template

/** Guardrail `vanilla-no-dollar-braces`: External templates do NOT contain ${} closures */
export const vanillaNoDollarBraces = {
  id: "vanilla-no-dollar-braces",
  label: "External templates do NOT contain ${} closures",
  description: ".template.html files can only use {{ }}, <for>, <if>, and @action. No ${} closures.",
  check: (code, context) => {
    const isTemplate = context?.fileName?.endsWith(".template.html") || false;
    const hasDollarBraces = /\${[^}]+\}/.test(code);

    if (!isTemplate && hasDollarBraces) {
      return { pass: true, note: "Not a .template.html file - ${} is valid here" };
    }

    if (isTemplate && hasDollarBraces) {
      return {
        pass: false,
        failCount: 1,
        detail: ["${} found in external template"],
        suggestion: 'Replace ${} closures with @click="handler" and use {{ expr }} for data expressions.',
      };
    }

    return { pass: true };
  },
};
