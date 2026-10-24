/** The rules rule-mcp-styleguide-comments owns, in canonical order. */
import { noCommentedOutCode } from "./_no-commented-out-code.js";
import { noFutureUseCode } from "./_no-future-use-code.js";
import { jsCommentNoHistory } from "./_no-history.js";
import { jsdocRequired } from "./_jsdoc-required.js";

export const GUARDRAILS = [noCommentedOutCode, noFutureUseCode, jsCommentNoHistory, jsdocRequired];
