/** Guardrail `a11y-role-button-focusable`: A role="button" element is reachable by keyboard. */
import { TAG_ATTRIBUTES, a11yRule } from "./_a11y-helpers.js";

const OPENING_TAG = new RegExp(String.raw`<([a-z][\w-]*)\b(${TAG_ATTRIBUTES})\/?>`, "gi");
const ROLE_BUTTON = /\brole\s*=\s*\{?\s*["']button["']\s*\}?/i;
/** Elements Tab already reaches: native form controls, and a link with href. */
const NATIVELY_FOCUSABLE = /^(?:button|input|select|textarea)$/i;

/** Flags a non-native element with role="button" and no tabindex. */
export const a11yRoleButtonFocusable = a11yRule({
  id: "a11y-role-button-focusable",
  wcag: "2.1.1",
  label: "A role=button element is reachable by keyboard",
  description: 'role="button" on a non-native element announces a button that Tab never reaches, so a keyboard user hears about a control they cannot use.',
  suggestion: 'Use a native <button>, or add tabindex="0" and Enter/Space handling',
  find: (code) =>
    [...code.matchAll(OPENING_TAG)]
      .filter(
        ([, name, attributes]) =>
          ROLE_BUTTON.test(attributes) && !NATIVELY_FOCUSABLE.test(name) && !(/^a$/i.test(name) && /\bhref\s*=/i.test(attributes)) && !/\btabindex\s*=/i.test(attributes),
      )
      .map((m) => m[0]),
});
