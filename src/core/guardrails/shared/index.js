

/** Shared guardrail family: the rules every skill enforces, one per file. */
import { noCssClasses } from "./_no-css-classes.js";
import { noInlineStyles } from "./_no-inline-styles.js";
import { semanticHtml } from "./_semantic-html.js";
import { externalCss } from "./_external-css.js";
import { barrelFileTree } from "./_barrel-file-tree.js";
import { fileNaming } from "./_file-naming.js";
import { dataPartNaming } from "./_data-part-naming.js";
import { jsdocRequired } from "./_jsdoc-required.js";
import { cssCommentsRequired } from "./_css-comments-required.js";
import { a11yTestRequired } from "./_a11y-test-required.js";
import { noPlaceholderImplementation } from "./_no-placeholder-implementation.js";
import { noSuppressedErrors } from "./_no-suppressed-errors.js";
import { verifiedDependenciesOnly } from "./_verified-dependencies-only.js";
import { cssFlexFirst } from "./_css-flex-first.js";
import { noSpeculativeAuditTable } from "../quality/simplicity/_no-speculative-audit-table.js";
import { noFutureUseCode } from "../quality/comments/_no-future-use-code.js";
import { noCommentedOutCode } from "../quality/comments/_no-commented-out-code.js";

/** The simplicity view: the same rule objects the quality family owns. */
export const SIMPLICITY_GUARDRAILS = [noSpeculativeAuditTable, noFutureUseCode, noCommentedOutCode];

export const SHARED_GUARDRAILS = [
  noCssClasses,
  noInlineStyles,
  semanticHtml,
  externalCss,
  barrelFileTree,
  fileNaming,
  dataPartNaming,
  jsdocRequired,
  cssCommentsRequired,
  a11yTestRequired,
  noPlaceholderImplementation,
  noSuppressedErrors,
  verifiedDependenciesOnly,
  cssFlexFirst,
  ...SIMPLICITY_GUARDRAILS,
];
