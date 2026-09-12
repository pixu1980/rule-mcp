/** Guardrail `ts-catch-unknown`: Catch clauses use unknown */
import { countedVerdict, stripLiterals, tsSkipResult } from "@rule-mcp/sdk";

export const tsCatchUnknown = {
  id: "ts-catch-unknown",
  label: "Catch clauses use unknown",
  description: "JavaScript can throw anything - a string, null, an object that is not an Error. any lets the handler assume otherwise and crash.",
  check: (code, context) => {
    const skip = tsSkipResult(code, context);

    if (skip) {
      return skip;
    }
    const hits = stripLiterals(code).match(/catch\s*\(\s*\w+\s*:\s*any\s*\)/g) ?? [];

    return countedVerdict(hits, { maxDetail: 10, suggestion: "Type the catch variable as unknown and check with instanceof before touching it. strict mode already does this." });
  },
};
