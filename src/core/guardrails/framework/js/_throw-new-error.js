/** Guardrail `js-throw-new-error`: throw requires new for error constructors */
export const jsThrowNewError = {
  id: "js-throw-new-error",
  label: "throw requires new for error constructors",
  description: "Errors must be created with new: throw new Error('...'). Calling error constructors as functions (throw Error('...')) is forbidden.",
  check: (code) => {
    const violations = code.match(/throw\s+(?!new\s+)(?:Error|TypeError|RangeError|SyntaxError|ReferenceError|EvalError|URIError)\s*\(/g) || [];

    if (violations.length === 0) {
      return { pass: true, note: "No bare error constructor throws found" };
    }

    return {
      pass: false,
      failCount: violations.length,
      detail: violations.slice(0, 5),
      suggestion: "Use new when throwing errors: throw new Error('message').",
    };
  },
};
