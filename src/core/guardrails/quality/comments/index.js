// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/** Comment-hygiene guardrails, one rule per file. */
import { noFutureUseCode } from "./_no-future-use-code.js";
import { noCommentedOutCode } from "./_no-commented-out-code.js";
import { jsCommentNoHistory } from "./_no-history.js";

export const COMMENT_GUARDRAILS = [noFutureUseCode, noCommentedOutCode, jsCommentNoHistory];
