/** TypeScript quality guardrails, one rule per file. */
import { tsNoExplicitAny } from "./_no-explicit-any.js";
import { tsCatchUnknown } from "./_catch-unknown.js";
import { tsNoDoubleAssertion } from "./_no-double-assertion.js";
import { tsUnionOverEnum } from "./_union-over-enum.js";

export const TYPESCRIPT_GUARDRAILS = [tsNoExplicitAny, tsCatchUnknown, tsNoDoubleAssertion, tsUnionOverEnum];
