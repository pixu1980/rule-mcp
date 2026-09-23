/**
 * FILE: _Avatar.jsx
 * USAGE: Circular avatar with initials and color. No image support for MVP.
 */
import React, { useEffect, useRef, useMemo } from "react";

import cssText from "./_Avatar.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

/**
 * Generate initials from first and last name.
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string} Up to 2 initials
 */
function getInitials(firstName, lastName) {
  const first = firstName ? firstName.charAt(0).toUpperCase() : "";
  const last = lastName ? lastName.charAt(0).toUpperCase() : "";
  return first + last || "?";
}

/**
 * Circular avatar displaying initials on a colored background.
 * @param {{ firstName: string, lastName: string, color: string, size?: 'sm' | 'md' | 'lg' }} props
 */
export function Avatar({ firstName, lastName, color, size = "md" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  const initials = useMemo(() => getInitials(firstName, lastName), [firstName, lastName]);

  return (
    <figure
      ref={ref}
      data-part="avatar"
      data-size={size}
      role="img"
      aria-label={`${firstName} ${lastName}`}
      style={{ backgroundColor: color }}
    >
      <span data-part="avatar-initials">{initials}</span>
    </figure>
  );
}
