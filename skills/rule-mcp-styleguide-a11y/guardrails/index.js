/** The rules rule-mcp-styleguide-a11y owns, in canonical order. */
import { a11yAriaHiddenFocusable } from "./_a11y-aria-hidden-focusable.js";
import { a11yFocusVisible } from "./_a11y-focus-visible.js";
import { a11yFormLabel } from "./_a11y-form-label.js";
import { a11yHtmlLang } from "./_a11y-html-lang.js";
import { a11yIframeTitle } from "./_a11y-iframe-title.js";
import { a11yImgAlt } from "./_a11y-img-alt.js";
import { a11yNoAutoplay } from "./_a11y-no-autoplay.js";
import { a11yPositiveTabindex } from "./_a11y-positive-tabindex.js";
import { a11yTestRequired } from "./_a11y-test-required.js";
import { a11yVideoCaptions } from "./_a11y-video-captions.js";

export const GUARDRAILS = [
  a11yAriaHiddenFocusable,
  a11yFocusVisible,
  a11yFormLabel,
  a11yHtmlLang,
  a11yIframeTitle,
  a11yImgAlt,
  a11yNoAutoplay,
  a11yPositiveTabindex,
  a11yTestRequired,
  a11yVideoCaptions,
];
