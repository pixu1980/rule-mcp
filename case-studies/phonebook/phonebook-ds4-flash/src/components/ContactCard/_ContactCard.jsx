/**
 * FILE: _ContactCard.jsx
 * USAGE: Contact list item — avatar, name, phone, and category indicator.
 */
import React, { useEffect, useRef } from "react";
import { Avatar } from "@/components/Avatar/index.js";

import cssText from "./_ContactCard.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

const CATEGORY_LABELS = {
  friends: "Amici",
  family: "Famiglia",
  work: "Lavoro",
};

/**
 * Compact contact card for the sidebar list.
 * @param {{ contact: object, isSelected: boolean, onSelect: () => void }} props
 */
export function ContactCard({ contact, isSelected, onSelect }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  return (
    <article
      ref={ref}
      data-part="contact-card"
      data-selected={isSelected ? "" : null}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      tabIndex={0}
      role="button"
      aria-label={`${contact.firstName} ${contact.lastName}`}
    >
      <Avatar
        firstName={contact.firstName}
        lastName={contact.lastName}
        color={contact.avatarColor}
        size="sm"
      />
      <section data-part="card-info">
        <p data-part="card-name">
          {contact.firstName} <strong>{contact.lastName}</strong>
        </p>
        <p data-part="card-phone">{contact.phone}</p>
      </section>
      {contact.category && (
        <span data-part="card-category" data-category={contact.category}>
          {CATEGORY_LABELS[contact.category] || contact.category}
        </span>
      )}
    </article>
  );
}
