/**
 * @file src/components/Sidebar/_Sidebar.jsx
 * @description Left panel: draggable titlebar area, app title, add button,
 * search bar, group filter tabs, and scrollable contact list.
 */
import { useEffect } from "react";
import cssText from "./_Sidebar.css?raw";
import { adoptSheet } from "../../helpers/index.js";
import { useAppState, useAppDispatch } from "../../helpers/index.js";
import { SearchBar } from "../SearchBar/index.js";
import { GroupFilter } from "../GroupFilter/index.js";
import { ContactList } from "../ContactList/index.js";
import { Icon } from "../Icon/index.js";

/** @type {CSSStyleSheet} */
const _sheet = (() => {
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  return s;
})();

/**
 * Left sidebar panel.
 */
export function Sidebar() {
  useEffect(() => {
    adoptSheet(_sheet);
  }, []);

  const { searchQuery, activeGroup, contacts } = useAppState();
  const dispatch = useAppDispatch();

  const total = contacts.length;

  return (
    <aside data-part="sidebar">
      {/* macOS traffic-light drag region */}
      <div data-part="titlebar" aria-hidden="true" />

      {/* Header row */}
      <header data-part="sidebar-header">
        <h1 data-part="sidebar-title">Contacts</h1>
        <span data-part="contact-count" aria-label={`${total} contacts`}>
          {total}
        </span>
        <button
          data-part="add-btn"
          aria-label="Add new contact"
          onClick={() => dispatch({ type: "START_EDIT", payload: "new" })}
        >
          <Icon name="plus" size={17} />
        </button>
      </header>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={(v) => dispatch({ type: "SET_SEARCH", payload: v })}
      />

      {/* Group filter */}
      <GroupFilter
        active={activeGroup}
        onChange={(id) => dispatch({ type: "SET_GROUP", payload: id })}
      />

      {/* Scrollable list */}
      <div data-part="list-scroll">
        <ContactList />
      </div>
    </aside>
  );
}
