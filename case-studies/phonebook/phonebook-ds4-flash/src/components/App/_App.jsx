/**
 * FILE: _App.jsx
 * USAGE: Root application component — split-pane layout with Sidebar + Detail panel.
 */
import React, { useEffect, useRef } from "react";
import { useAppState, useAppDispatch, ACTIONS } from "@/context/_AppContext.jsx";
import { Sidebar } from "@/components/Sidebar/index.js";
import { ContactDetail } from "@/components/ContactDetail/index.js";
import { ContactForm } from "@/components/ContactForm/index.js";
import { EmptyState } from "@/components/EmptyState/index.js";
import { Modal } from "@/components/Modal/index.js";

import cssText from "./_App.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

/**
 * Root App component.
 * Renders the macOS-style split pane layout.
 */
export function App() {
  const ref = useRef(null);
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { selectedId, contacts, showForm, editingContact, showDeleteModal, contactToDelete } = state;

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  const selectedContact = contacts.find((c) => c.id === selectedId) || null;

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;
    try {
      const result = await window.qt.deleteContact(contactToDelete.id);
      if (result.ok) {
        dispatch({ type: ACTIONS.DELETE_CONTACT, payload: contactToDelete.id });
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
    dispatch({ type: ACTIONS.HIDE_DELETE_MODAL });
  };

  const handleSaveContact = async (data) => {
    try {
      const result = await window.qt.saveContact(data);
      if (result.ok) {
        if (data.id) {
          dispatch({ type: ACTIONS.UPDATE_CONTACT, payload: result.contact });
        } else {
          dispatch({ type: ACTIONS.ADD_CONTACT, payload: result.contact });
        }
      }
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  return (
    <section ref={ref} data-part="app">
      <Sidebar />
      <section data-part="detail-panel">
        {showForm ? (
          <ContactForm
            contact={editingContact}
            onSave={handleSaveContact}
            onCancel={() => dispatch({ type: ACTIONS.HIDE_FORM })}
          />
        ) : selectedContact ? (
          <ContactDetail
            contact={selectedContact}
            onEdit={() => dispatch({ type: ACTIONS.SET_EDITING, payload: selectedContact })}
            onDelete={() => dispatch({ type: ACTIONS.SET_CONTACT_TO_DELETE, payload: selectedContact })}
          />
        ) : (
          <EmptyState />
        )}
      </section>

      {showDeleteModal && contactToDelete && (
        <Modal
          title="Elimina contatto"
          message={`Sei sicuro di voler eliminare ${contactToDelete.firstName} ${contactToDelete.lastName}?`}
          confirmLabel="Elimina"
          cancelLabel="Annulla"
          onConfirm={handleDeleteConfirm}
          onCancel={() => dispatch({ type: ACTIONS.HIDE_DELETE_MODAL })}
          isDanger
        />
      )}
    </section>
  );
}
