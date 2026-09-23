/**
 * FILE: _ContactList.jsx
 * USAGE: Filtered contact list with search + category grouped by first letter.
 */
import React, { useEffect, useRef, useMemo } from "react";
import { useAppState, useAppDispatch, ACTIONS } from "@/context/_AppContext.jsx";
import { ContactCard } from "@/components/ContactCard/index.js";

import cssText from "./_ContactList.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

/**
 * Filter and group contacts by search query + category filter.
 * @param {Array} contacts
 * @param {string} query
 * @param {string} category
 * @returns {Array} Grouped contacts [{letter, contacts}]
 */
function filterAndGroup(contacts, query, category) {
  let filtered = contacts;

  if (category !== "all") {
    filtered = filtered.filter((c) => c.category === category);
  }

  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }

  const groups = {};
  for (const contact of filtered) {
    const letter = contact.lastName.charAt(0).toUpperCase();
    if (!groups[letter]) {
      groups[letter] = [];
    }
    groups[letter].push(contact);
  }

  return Object.keys(groups)
    .sort()
    .map((letter) => ({ letter, contacts: groups[letter] }));
}

/**
 * Renders the filtered and grouped contact list.
 */
export function ContactList() {
  const ref = useRef(null);
  const state = useAppState();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  const groups = useMemo(
    () => filterAndGroup(state.contacts, state.searchQuery, state.categoryFilter),
    [state.contacts, state.searchQuery, state.categoryFilter],
  );

  if (state.isLoading) {
    return (
      <section ref={ref} data-part="contact-list">
        <p data-part="loading-text">Caricamento…</p>
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section ref={ref} data-part="contact-list">
        <p data-part="empty-text">
          {state.searchQuery || state.categoryFilter !== "all"
            ? "Nessun risultato"
            : "Nessun contatto"}
        </p>
      </section>
    );
  }

  return (
    <section ref={ref} data-part="contact-list">
      {groups.map((group) => (
        <section key={group.letter} data-part="group">
          <header data-part="group-header">
            <span data-part="group-letter">{group.letter}</span>
          </header>
          <ul data-part="group-list">
            {group.contacts.map((contact) => (
              <li
                key={contact.id}
                data-part="group-item"
                data-selected={state.selectedId === contact.id ? "" : null}
              >
                <ContactCard
                  contact={contact}
                  isSelected={state.selectedId === contact.id}
                  onSelect={() => dispatch({ type: ACTIONS.SELECT_CONTACT, payload: contact.id })}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
