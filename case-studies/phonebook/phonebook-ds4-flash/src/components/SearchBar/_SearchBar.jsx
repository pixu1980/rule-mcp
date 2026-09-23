/**
 * FILE: _SearchBar.jsx
 * USAGE: Search input with magnifying glass icon and clear button.
 */
import React, { useEffect, useRef } from "react";

import cssText from "./_SearchBar.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

/**
 * @param {{ value: string, onChange: (val: string) => void }} props
 */
export function SearchBar({ value, onChange }) {
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  return (
    <search ref={ref} data-part="search-bar">
      <svg data-part="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        data-part="search-input"
        type="search"
        placeholder="Cerca contatti…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Cerca contatti"
      />
      {value && (
        <button
          data-part="search-clear"
          onClick={() => onChange("")}
          aria-label="Cancella ricerca"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </search>
  );
}
