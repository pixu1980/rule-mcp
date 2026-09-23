/**
 * @file src/components/ContactList/_ContactList.jsx
 * @description Scrollable contact list organised in alphabetical sections.
 * Filters and groups are derived from app state.
 */
import { useEffect } from "react";
import cssText from "./_ContactList.css?raw";
import { adoptSheet } from "../../helpers/index.js";
import { filterContacts, groupByLetter } from "../../helpers/index.js";
import { useAppState, useAppDispatch } from "../../helpers/index.js";
import { ContactCard } from "../ContactCard/index.js";

/** @type {CSSStyleSheet} */
const _sheet = (() => {
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  return s;
})();

/**
 * Renders an empty placeholder when no contacts match the filter.
 */
function EmptyFilter() {
  return (
    <p data-part="empty-filter">No contacts found</p>
  );
}

/**
 * Main contact list component.
 */
export function ContactList() {
  useEffect(() => {
    adoptSheet(_sheet);
  }, []);

  const { contacts, selectedId, searchQuery, activeGroup } = useAppState();
  const dispatch = useAppDispatch();

  const filtered = filterContacts(contacts, searchQuery, activeGroup);
  const grouped = groupByLetter(filtered);

  if (filtered.length === 0) {
    return <EmptyFilter />;
  }

  return (
    <section data-part="contact-list" aria-label="Contacts list">
      {grouped.map(({ letter, contacts: group }) => (
        <article key={letter} data-part="letter-group">
          <h2 data-part="letter-header">{letter}</h2>
          <ul data-part="letter-contacts">
            {group.map((contact) => (
              <li key={contact.id} data-part="list-item">
                <ContactCard
                  contact={contact}
                  selected={selectedId === contact.id}
                  onSelect={() =>
                    dispatch({ type: "SELECT", payload: contact.id })
                  }
                />
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
