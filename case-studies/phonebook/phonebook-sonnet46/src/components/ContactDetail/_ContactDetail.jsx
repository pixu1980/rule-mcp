/**
 * @file src/components/ContactDetail/_ContactDetail.jsx
 * @description Full contact detail view: hero section with large avatar,
 * quick-action buttons, and organized info sections (phone, email, address,
 * birthday, company, notes, social). Includes favourite toggle with spring
 * animation, edit and delete actions.
 */
import { useEffect, useState } from "react";
import cssText from "./_ContactDetail.css?raw";
import { adoptSheet } from "../../helpers/index.js";
import { useAppDispatch } from "../../helpers/index.js";
import { formatBirthday, formatLabel } from "../../helpers/index.js";
import { Avatar } from "../Avatar/index.js";
import { Icon } from "../Icon/index.js";

/** @type {CSSStyleSheet} */
const _sheet = (() => {
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  return s;
})();

/**
 * A single info row (label + value) within a section.
 * @param {{ label: string, value: string, accent?: boolean, href?: string }} props
 */
function InfoRow({ label, value, accent = false, href }) {
  if (!value) return null;
  return (
    <li data-part="info-row">
      <span data-part="row-label">{label}</span>
      {href ? (
        <a
          data-part="row-value"
          data-accent={accent ? "" : undefined}
          href={href}
          aria-label={`${label}: ${value}`}
        >
          {value}
        </a>
      ) : (
        <span
          data-part="row-value"
          data-accent={accent ? "" : undefined}
        >
          {value}
        </span>
      )}
    </li>
  );
}

/**
 * A named section card with an icon and a list of InfoRows.
 * @param {{ icon: string, title: string, children: React.ReactNode }} props
 */
function InfoSection({ icon, title, children }) {
  return (
    <article data-part="info-section">
      <header data-part="section-header">
        <Icon name={icon} size={14} />
        <span data-part="section-title">{title}</span>
      </header>
      <ul data-part="section-rows">
        {children}
      </ul>
    </article>
  );
}

/**
 * Quick-action circular button.
 * @param {{ icon: string, label: string, color?: string, onClick?: () => void }} props
 */
function QuickAction({ icon, label, color = "default", onClick }) {
  return (
    <button data-part="quick-action" data-color={color} onClick={onClick} aria-label={label}>
      <span data-part="qa-icon-wrap">
        <Icon name={icon} size={20} />
      </span>
      <span data-part="qa-label">{label}</span>
    </button>
  );
}

/**
 * Full contact detail panel.
 * @param {{ contact: import('../../helpers/_sampleData.js').Contact }} props
 */
export function ContactDetail({ contact }) {
  useEffect(() => {
    adoptSheet(_sheet);
  }, []);

  const dispatch = useAppDispatch();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fullName = `${contact.firstName} ${contact.lastName}`.trim();
  const isFavorite = contact.favorite;

  function handleFavoriteToggle() {
    dispatch({ type: "TOGGLE_FAVORITE", payload: contact.id });
  }

  function handleEdit() {
    dispatch({ type: "START_EDIT", payload: contact });
  }

  function handleDelete() {
    if (deleteConfirm) {
      dispatch({ type: "DELETE_CONTACT", payload: contact.id });
    } else {
      setDeleteConfirm(true);
    }
  }

  // Reset delete confirm when contact changes
  useEffect(() => {
    setDeleteConfirm(false);
  }, [contact.id]);

  // Build address display
  const addressLines = contact.address
    ? [
        contact.address.street,
        [contact.address.city, contact.address.state, contact.address.zip]
          .filter(Boolean)
          .join(", "),
        contact.address.country,
      ].filter(Boolean)
    : [];

  return (
    <section data-part="contact-detail">
      {/* ---- Hero ---- */}
      <header data-part="detail-hero">
        <div data-part="hero-avatar">
          <Avatar
            firstName={contact.firstName}
            lastName={contact.lastName}
            size="xl"
            ring
          />
          <button
            data-part="favorite-btn"
            data-active={isFavorite ? "" : undefined}
            onClick={handleFavoriteToggle}
            aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
            aria-pressed={isFavorite}
          >
            <Icon name="star" size={16} filled={isFavorite} />
          </button>
        </div>

        <div data-part="hero-info">
          <h1 data-part="detail-name">{fullName}</h1>
          {(contact.jobTitle || contact.company) && (
            <p data-part="detail-subtitle">
              {[contact.jobTitle, contact.company].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Quick actions */}
        <nav data-part="quick-actions" aria-label="Contact actions">
          {contact.phones?.[0] && (
            <QuickAction
              icon="phone"
              label="Call"
              color="blue"
              onClick={() => {
                const tel = contact.phones[0].value.replace(/\s/g, "");
                window.open(`tel:${tel}`);
              }}
            />
          )}
          {contact.emails?.[0] && (
            <QuickAction
              icon="mail"
              label="Mail"
              color="green"
              onClick={() => window.open(`mailto:${contact.emails[0].value}`)}
            />
          )}
          {contact.phones?.[0] && (
            <QuickAction
              icon="chat"
              label="Message"
              color="teal"
            />
          )}
          {contact.phones?.[0] && (
            <QuickAction
              icon="video"
              label="FaceTime"
              color="purple"
            />
          )}
        </nav>
      </header>

      {/* ---- Info sections ---- */}
      <div data-part="detail-body">

        {/* Phones */}
        {contact.phones?.length > 0 && (
          <InfoSection icon="phone" title="Phone">
            {contact.phones.map((p) => (
              <InfoRow
                key={p.id}
                label={formatLabel(p.label)}
                value={p.value}
                accent
                href={`tel:${p.value.replace(/\s/g, "")}`}
              />
            ))}
          </InfoSection>
        )}

        {/* Emails */}
        {contact.emails?.length > 0 && (
          <InfoSection icon="mail" title="Email">
            {contact.emails.map((e) => (
              <InfoRow
                key={e.id}
                label={formatLabel(e.label)}
                value={e.value}
                accent
                href={`mailto:${e.value}`}
              />
            ))}
          </InfoSection>
        )}

        {/* Company */}
        {contact.company && (
          <InfoSection icon="briefcase" title="Company">
            <InfoRow label="Company" value={contact.company} />
            {contact.jobTitle && (
              <InfoRow label="Title" value={contact.jobTitle} />
            )}
          </InfoSection>
        )}

        {/* Address */}
        {addressLines.length > 0 && (
          <InfoSection icon="map-pin" title="Address">
            <li data-part="info-row" data-multiline="">
              <span data-part="row-label">Home</span>
              <address data-part="row-address">
                {addressLines.map((line, i) => (
                  <span key={i} data-part="address-line">{line}</span>
                ))}
              </address>
            </li>
          </InfoSection>
        )}

        {/* Birthday */}
        {contact.birthday && (
          <InfoSection icon="calendar" title="Birthday">
            <InfoRow
              label="Date"
              value={formatBirthday(contact.birthday)}
            />
          </InfoSection>
        )}

        {/* Notes */}
        {contact.notes && (
          <InfoSection icon="document" title="Notes">
            <li data-part="info-row" data-multiline="">
              <span data-part="row-label">Note</span>
              <p data-part="row-notes">{contact.notes}</p>
            </li>
          </InfoSection>
        )}

        {/* Social */}
        {contact.social?.length > 0 && (
          <InfoSection icon="globe" title="Social">
            {contact.social.map((s) => (
              <InfoRow
                key={s.id}
                label={formatLabel(s.platform)}
                value={s.handle}
                accent
              />
            ))}
          </InfoSection>
        )}

        {/* Actions — edit / delete */}
        <footer data-part="detail-actions">
          <button
            data-part="action-btn"
            data-variant="secondary"
            onClick={handleEdit}
            aria-label="Edit contact"
          >
            <Icon name="pencil" size={15} />
            Edit Contact
          </button>

          <button
            data-part="action-btn"
            data-variant={deleteConfirm ? "danger-confirm" : "danger"}
            onClick={handleDelete}
            aria-label={deleteConfirm ? "Confirm deletion" : "Delete contact"}
            onBlur={() => setDeleteConfirm(false)}
          >
            <Icon name="trash" size={15} />
            {deleteConfirm ? "Confirm Delete?" : "Delete"}
          </button>
        </footer>
      </div>
    </section>
  );
}
