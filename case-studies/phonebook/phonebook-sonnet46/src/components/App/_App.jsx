/**
 * @file src/components/App/_App.jsx
 * @description Root layout: wraps AppProvider and renders the two-panel shell
 * (sidebar + detail). Also conditionally renders the ContactForm modal.
 */
import { useEffect } from "react";
import cssText from "./_App.css?raw";
import { adoptSheet } from "../../helpers/index.js";
import { AppProvider, useAppState } from "../../helpers/index.js";
import { Sidebar } from "../Sidebar/index.js";
import { ContactDetail } from "../ContactDetail/index.js";
import { EmptyState } from "../EmptyState/index.js";
import { ContactForm } from "../ContactForm/index.js";

/** @type {CSSStyleSheet} */
const _sheet = (() => {
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  return s;
})();

/**
 * Inner shell — rendered after context is available.
 */
function AppShell() {
  useEffect(() => {
    adoptSheet(_sheet);
  }, []);

  const { selectedId, editingContact, contacts } = useAppState();
  const selectedContact = contacts.find((c) => c.id === selectedId) ?? null;

  return (
    <div data-part="app">
      <Sidebar />
      <main data-part="detail-panel">
        {selectedContact ? (
          <ContactDetail key={selectedContact.id} contact={selectedContact} />
        ) : (
          <EmptyState />
        )}
      </main>
      {editingContact !== null && <ContactForm />}
    </div>
  );
}

/**
 * Root application component — provides context, renders the shell.
 */
export function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
