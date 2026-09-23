/**
 * FILE: _ContactDetail.jsx
 * USAGE: Full contact detail view — avatar, info fields, action buttons.
 */
import React, { useEffect, useRef } from "react";
import { Avatar } from "@/components/Avatar/index.js";

import cssText from "./_ContactDetail.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

const CATEGORY_LABELS = {
  friends: "Amici",
  family: "Famiglia",
  work: "Lavoro",
};

/**
 * Format a date string to Italian locale.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

/**
 * @param {{ contact: object, onEdit: () => void, onDelete: () => void }} props
 */
export function ContactDetail({ contact, onEdit, onDelete }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  return (
    <article ref={ref} data-part="detail">
      <header data-part="detail-header">
        <Avatar
          firstName={contact.firstName}
          lastName={contact.lastName}
          color={contact.avatarColor}
          size="lg"
        />
        <section data-part="detail-title-group">
          <h2 data-part="detail-name">
            {contact.firstName} <strong>{contact.lastName}</strong>
          </h2>
          {contact.category && (
            <p data-part="detail-category" data-category={contact.category}>
              {CATEGORY_LABELS[contact.category] || contact.category}
            </p>
          )}
        </section>
      </header>

      <section data-part="detail-actions">
        <button data-part="action-btn" data-action="edit" onClick={onEdit}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M13 2L16 5L7 14L3 15L4 11L13 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Modifica</span>
        </button>
        <button data-part="action-btn" data-action="delete" onClick={onDelete}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3 5H15M6 5V3.5C6 3.22 6.22 3 6.5 3H11.5C11.78 3 12 3.22 12 3.5V5M7 8V13M11 8V13M4.5 5L5.5 14.5C5.54 14.78 5.78 15 6.06 15H11.94C12.22 15 12.46 14.78 12.5 14.5L13.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Elimina</span>
        </button>
      </section>

      <section data-part="detail-fields">
        {contact.phone && (
          <section data-part="field">
            <p data-part="field-label">Telefono</p>
            <a data-part="field-value" href={`tel:${contact.phone}`}>{contact.phone}</a>
          </section>
        )}
        {contact.email && (
          <section data-part="field">
            <p data-part="field-label">Email</p>
            <a data-part="field-value" href={`mailto:${contact.email}`}>{contact.email}</a>
          </section>
        )}
        {contact.address && (
          <section data-part="field">
            <p data-part="field-label">Indirizzo</p>
            <p data-part="field-value">{contact.address}</p>
          </section>
        )}
        {contact.notes && (
          <section data-part="field">
            <p data-part="field-label">Note</p>
            <p data-part="field-value">{contact.notes}</p>
          </section>
        )}
      </section>

      <footer data-part="detail-footer">
        <p data-part="detail-meta">
          Creato il {formatDate(contact.createdAt)}
        </p>
        {contact.updatedAt !== contact.createdAt && (
          <p data-part="detail-meta">
            Aggiornato il {formatDate(contact.updatedAt)}
          </p>
        )}
      </footer>
    </article>
  );
}
