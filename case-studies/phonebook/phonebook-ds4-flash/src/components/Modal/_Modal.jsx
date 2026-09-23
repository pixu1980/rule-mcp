/**
 * FILE: _Modal.jsx
 * USAGE: Dialog overlay for confirmations — delete confirm primarily.
 * Uses native <dialog> element with portal to body.
 */
import React, { useEffect, useRef, useCallback } from "react";

import cssText from "./_Modal.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

/**
 * Accessible modal dialog with confirm/cancel actions.
 * @param {{
 *   title: string,
 *   message: string,
 *   confirmLabel: string,
 *   cancelLabel: string,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 *   isDanger?: boolean,
 * }} props
 */
export function Modal({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, isDanger = false }) {
  const ref = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  /* Show dialog as modal on mount, close on unmount */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (dialog && dialog.open) {
        dialog.close();
      }
    };
  }, []);

  /* Close on Escape */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        onCancel();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <section ref={ref} data-part="modal-backdrop" onClick={onCancel}>
      <dialog
        ref={dialogRef}
        data-part="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="modal-title"
        aria-describedby="modal-message"
      >
        <header data-part="modal-header">
          <h3 id="modal-title" data-part="modal-title">{title}</h3>
        </header>
        <p id="modal-message" data-part="modal-message">{message}</p>
        <footer data-part="modal-footer">
          <button data-part="modal-btn" data-variant="cancel" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button
            data-part="modal-btn"
            data-variant={isDanger ? "danger" : "confirm"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </footer>
      </dialog>
    </section>
  );
}
