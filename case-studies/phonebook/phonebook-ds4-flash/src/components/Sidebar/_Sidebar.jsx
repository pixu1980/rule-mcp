/**
 * FILE: _Sidebar.jsx
 * USAGE: Sidebar panel — groups SearchBar, category filter, and ContactList.
 */
import React, { useEffect, useRef } from "react";
import { useAppState, useAppDispatch, ACTIONS, CATEGORIES } from "@/context/_AppContext.jsx";
import { SearchBar } from "@/components/SearchBar/index.js";
import { ContactList } from "@/components/ContactList/index.js";

import cssText from "./_Sidebar.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

/**
 * Sidebar with search, category filter, and contact list.
 */
export function Sidebar() {
  const ref = useRef(null);
  const state = useAppState();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  const totalCount = state.contacts.length;

  return (
    <aside ref={ref} data-part="sidebar">
      <header data-part="sidebar-header">
        <h1 data-part="sidebar-title">Rubrica</h1>
        <p data-part="sidebar-count">
          {totalCount} {totalCount === 1 ? "contatto" : "contatti"}
        </p>
      </header>

      <SearchBar
        value={state.searchQuery}
        onChange={(val) => dispatch({ type: ACTIONS.SET_SEARCH, payload: val })}
      />

      <nav data-part="category-nav">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            data-part="category-chip"
            data-selected={state.categoryFilter === cat.id ? "" : null}
            onClick={() => dispatch({ type: ACTIONS.SET_CATEGORY, payload: cat.id })}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      <section data-part="list-container">
        <ContactList />
      </section>

      <footer data-part="sidebar-footer">
        <button
          data-part="add-button"
          onClick={() => dispatch({ type: ACTIONS.SHOW_FORM })}
          aria-label="Aggiungi contatto"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span>Nuovo contatto</span>
        </button>
      </footer>
    </aside>
  );
}
