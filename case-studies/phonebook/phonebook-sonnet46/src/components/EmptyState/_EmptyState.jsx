/**
 * @file src/components/EmptyState/_EmptyState.jsx
 * @description Shown in the detail panel when no contact is selected.
 * Illustrative, calming, centred composition.
 */
import { useEffect } from "react";
import cssText from "./_EmptyState.css?raw";
import { adoptSheet } from "../../helpers/index.js";

/** @type {CSSStyleSheet} */
const _sheet = (() => {
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  return s;
})();

export function EmptyState() {
  useEffect(() => {
    adoptSheet(_sheet);
  }, []);

  return (
    <section data-part="empty-state" aria-label="No contact selected">
      <figure data-part="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 80 80" fill="none" width="80" height="80">
          <circle cx="40" cy="40" r="40" fill="rgba(79,142,247,0.06)" />
          <circle cx="40" cy="32" r="12" stroke="rgba(79,142,247,0.35)" strokeWidth="1.5" />
          <path
            d="M16 64c0-13.255 10.745-24 24-24s24 10.745 24 24"
            stroke="rgba(79,142,247,0.35)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </figure>
      <p data-part="empty-heading">Select a contact</p>
      <p data-part="empty-sub">Choose someone from your list to see their details</p>
    </section>
  );
}
