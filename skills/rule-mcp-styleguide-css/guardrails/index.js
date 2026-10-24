/** The rules rule-mcp-styleguide-css owns, in canonical order. */
import { cssCommentsRequired } from "./_css-comments-required.js";
import { cssFlexFirst } from "./_css-flex-first.js";
import { cssNoEllipsis } from "./_no-ellipsis.js";
import { externalCss } from "./_external-css.js";
import { noCssClasses } from "./_no-css-classes.js";
import { noInlineStyles } from "./_no-inline-styles.js";

export const GUARDRAILS = [cssCommentsRequired, cssFlexFirst, cssNoEllipsis, externalCss, noCssClasses, noInlineStyles];
