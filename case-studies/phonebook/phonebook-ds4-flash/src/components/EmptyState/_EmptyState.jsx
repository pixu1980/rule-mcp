/**
 * FILE: _EmptyState.jsx
 * USAGE: Placeholder shown when no contact is selected.
 */
import React, { useEffect, useRef } from "react";

import cssText from "./_EmptyState.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

/**
 * Empty state with illustration and guidance text.
 */
export function EmptyState() {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  return (
    <section ref={ref} data-part="empty-state">
      <figure data-part="empty-icon" aria-hidden="true">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <rect x="12" y="8" width="56" height="64" rx="8" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="32" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M24 64C24 54.0589 31.0589 46 40 46C48.9411 46 56 54.0589 56 64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </figure>
      <h2 data-part="empty-title">Seleziona un contatto</h2>
      <p data-part="empty-description">
        Scegli un contatto dalla lista o creane uno nuovo per iniziare.
      </p>
    </section>
  );
}
