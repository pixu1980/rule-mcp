/** @module core/guardrails/backend/input-validation */

export const inputValidation = {
  id: "input-validation",
  label: "Input validation present",
  description: "Request body and params must be validated (Zod, Joi, class-validator).",
  check: (code) => {
    const hasInput = /req\.body|req\.params|req\.query|request\.body|@Body\(\)|@Param\(\)|@Query\(\)/i.test(code);

    if (!hasInput) {
      return { pass: true, note: "No request input detected, skipping" };
    }

    const hasValidation =
      /z\.(?:object|string|number|boolean)|\.parse\(|\.safeParse\(|Joi\.(?:object|string)|class-validator|@Validate|express-validator/i.test(
        code,
      );

    return {
      pass: hasValidation,
      failCount: hasValidation ? 0 : 1,
      detail: hasValidation ? [] : ["No input validation found"],
      suggestion: "Add input validation with Zod, Joi, or class-validator before processing request data.",
    };
  },
};
