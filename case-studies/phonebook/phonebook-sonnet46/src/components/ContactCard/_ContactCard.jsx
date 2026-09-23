/**
 * @file src/components/ContactCard/_ContactCard.jsx
 * @description Compact contact row used in the sidebar list.
 * Shows avatar, full name, primary phone/email preview, and a favourite dot.
 * Highlights when selected; slides slightly on hover.
 */
import { useEffect } from "react";
import cssText from "./_ContactCard.css?raw";
import { adoptSheet } from "../../helpers/index.js";
import { Avatar } from "../Avatar/index.js";

/** @type {CSSStyleSheet} */
const _sheet = (() => {
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  return s;
})();

/**
 * @param {{
 *   contact: import('../../helpers/_sampleData.js').Contact,
 *   selected: boolean,
 *   onSelect: () => void
 * }} props
 */
export function ContactCard({ contact, selected, onSelect }) {
  useEffect(() => {
    adoptSheet(_sheet);
  }, []);

  const subtitle =
    contact.phones?.[0]?.value ?? contact.emails?.[0]?.value ?? contact.company ?? "";

  return (
    <button
      data-part="contact-card"
      data-selected={selected ? "" : undefined}
      data-favorite={contact.favorite ? "" : undefined}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${contact.firstName} ${contact.lastName}`}
    >
      <Avatar
        firstName={contact.firstName}
        lastName={contact.lastName}
        size="sm"
      />
      <span data-part="card-info">
        <span data-part="card-name">
          {contact.firstName} {contact.lastName}
        </span>
        {subtitle && (
          <span data-part="card-subtitle">{subtitle}</span>
        )}
      </span>
      {contact.favorite && (
        <span data-part="favorite-dot" aria-label="Favourite" />
      )}
    </button>
  );
}
