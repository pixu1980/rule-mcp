

/**
 * @module core/guardrails/semantic/error-message-actionable
 *
 * The first meaning-level rule: a thrown error should name the next action.
 *
 * A regex can find `new Error("Failed")`; it cannot tell whether the sentence
 * helps the person who has to recover. The rule extracts the literal messages
 * and asks the decision model one `noul` question about them. The answer is a
 * probability, and the rule is advisory: it reports and never fails a check.
 */

const ERROR = /new Error\(\s*["'`]([^"'`\n]+)["'`]\s*\)/gu;

/** The rule the semantic family ships. */
export const errorMessageActionable = {
  id: "semantic-error-message-actionable",
  label: "Error messages tell the caller what to do",
  description: "A thrown error names the next action, not only the failure (ADR 156; docs/audits/decision-models.md).",
  question: "Do these error messages tell the caller what to do next?",
  claim: "the messages tell the caller what to do",
  suggestion: "Name the variable, the file or the next action in the error message.",
  messages: (code) => [...String(code ?? "").matchAll(ERROR)].map((match) => match[1]),
  evaluate: (answer) => {
    const probability = Number(answer?.answers?.message?.noul);

    return { probability, pass: !Number.isFinite(probability) || probability >= 0.5 };
  },
};

/** The advisory family the census lists. */
export const SEMANTIC_GUARDRAILS = [errorMessageActionable];
