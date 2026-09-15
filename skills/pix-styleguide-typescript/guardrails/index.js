/** The rules rule-styleguide-typescript owns, in canonical order. */
import { tsCatchUnknown } from "./_catch-unknown.js";
import { tsNoDoubleAssertion } from "./_no-double-assertion.js";
import { tsNoExplicitAny } from "./_no-explicit-any.js";
import { tsUnionOverEnum } from "./_union-over-enum.js";

export const GUARDRAILS = [tsCatchUnknown, tsNoDoubleAssertion, tsNoExplicitAny, tsUnionOverEnum];
