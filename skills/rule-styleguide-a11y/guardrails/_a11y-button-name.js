/** Guardrail `a11y-button-name`: Every button has an accessible name. */
import { ANY_TAG, TAG_ATTRIBUTES, a11yRule } from "./_a11y-helpers.js";

/** A button, self-closing (JSX) or with its content up to the closing tag. */
const BUTTON = new RegExp(String.raw`<button\b(${TAG_ATTRIBUTES})(?:\/>|>([\s\S]*?)<\/button>)`, "gi");
/**
 * A naming attribute and its value: a quoted string, a JSX string literal, or
 * any other JSX expression (unknown statically, so trusted).
 */
const NAMING = /\b(?:aria-label|aria-labelledby|title)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(["'`])([^"'`]*)\3\s*\}|(\{))/gi;
/** An img with a non-empty alt inside the button. */
const NAMED_IMG = /\balt\s*=\s*(?:"[^"\s][^"]*"|'[^'\s][^']*'|\{)/i;

/** True when a naming attribute carries a value that is not statically blank. */
const hasName = (attributes) =>
  [...attributes.matchAll(NAMING)].some(([, double, single, , literal, expression]) => expression !== undefined || (double ?? single ?? literal).trim() !== "");

/** Flags a button with no text, no naming attribute and no named image inside. */
export const a11yButtonName = a11yRule({
  id: "a11y-button-name",
  wcag: "4.1.2",
  label: "Every button has an accessible name",
  description: 'A button with no text, no aria-label and no named image is announced as "button", so the user cannot tell what it does.',
  suggestion: "Add visible text, aria-label / aria-labelledby, or an img with a non-empty alt inside",
  find: (code) =>
    [...code.matchAll(BUTTON)]
      .filter(([, attributes, content = ""]) => {
        if (hasName(attributes) || hasName(content) || NAMED_IMG.test(content)) {
          return false;
        }

        return content.replaceAll(ANY_TAG, "").trim() === "";
      })
      .map((m) => m[0]),
});
