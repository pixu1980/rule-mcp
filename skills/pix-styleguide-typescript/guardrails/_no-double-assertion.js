/** Guardrail `ts-no-double-assertion`: No as-unknown-as escape hatch */

export const tsNoDoubleAssertion = {
  id: "ts-no-double-assertion",
  label: "No as-unknown-as escape hatch",
  description: "A double assertion silences the compiler twice over: it defeats both the original type and the check that would have caught the mismatch.",
  check: (code, context) => {
    const { countedVerdict, stripLiterals, tsSkipResult } = context.helpers;

    const skip = tsSkipResult(code, context);

    if (skip) {
      return skip;
    }

    const hits = stripLiterals(code).match(/\bas\s+unknown\s+as\b/g) ?? [];

    return countedVerdict(hits, { maxDetail: 10, suggestion: "Write a type guard that does a real runtime check, or fix the type the value actually has." });
  },
};
