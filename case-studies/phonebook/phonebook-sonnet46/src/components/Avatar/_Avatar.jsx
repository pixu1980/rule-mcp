/**
 * @file src/components/Avatar/_Avatar.jsx
 * @description Circular avatar with name initials and a deterministic colour.
 * Four sizes: xs (24), sm (32), md (44), lg (72), xl (88).
 * The avatar colour index (0–11) is derived from the full name via hash.
 */
import { useEffect } from "react";
import cssText from "./_Avatar.css?raw";
import { adoptSheet } from "../../helpers/index.js";
import { getAvatarColorIndex, getInitials } from "../../helpers/index.js";

/** @type {CSSStyleSheet} */
const _sheet = (() => {
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  return s;
})();

/**
 * Renders a circle avatar with initials.
 * @param {{
 *   firstName: string,
 *   lastName?: string,
 *   size?: "xs"|"sm"|"md"|"lg"|"xl",
 *   ring?: boolean
 * }} props
 */
export function Avatar({ firstName = "", lastName = "", size = "md", ring = false }) {
  useEffect(() => {
    adoptSheet(_sheet);
  }, []);

  const initials = getInitials(firstName, lastName);
  const colorIndex = getAvatarColorIndex(`${firstName}${lastName}`);

  return (
    <span
      data-part="avatar"
      data-size={size}
      data-color={colorIndex}
      data-ring={ring ? "" : undefined}
      aria-label={`${firstName} ${lastName}`.trim()}
    >
      {initials}
    </span>
  );
}
