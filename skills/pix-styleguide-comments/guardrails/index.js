/** The rules rule-styleguide-comments owns, in canonical order. */
import { noCommentedOutCode } from "./_no-commented-out-code.js";
import { noFutureUseCode } from "./_no-future-use-code.js";
import { jsCommentNoHistory } from "./_no-history.js";

export const GUARDRAILS = [noCommentedOutCode, noFutureUseCode, jsCommentNoHistory];
