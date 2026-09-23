/**
 * @file src/components/SearchBar/_SearchBar.jsx
 * @description Animated search input with magnifier icon and clear button.
 * Glows in accent colour on focus; clear button fades in when there is text.
 */
import { useEffect, useRef } from "react";
import cssText from "./_SearchBar.css?raw";
import { adoptSheet } from "../../helpers/index.js";
import { Icon } from "../Icon/index.js";

/** @type {CSSStyleSheet} */
const _sheet = (() => {
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  return s;
})();

/**
 * @param {{ value: string, onChange: (v: string) => void }} props
 */
export function SearchBar({ value, onChange }) {
  useEffect(() => {
    adoptSheet(_sheet);
  }, []);

  const inputRef = useRef(null);

  return (
    <search data-part="search-bar">
      <label data-part="search-label" htmlFor="contact-search" aria-label="Search contacts">
        <Icon name="search" size={15} />
      </label>
      <input
        id="contact-search"
        data-part="search-input"
        type="search"
        placeholder="Search"
        autoComplete="off"
        spellCheck="false"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        ref={inputRef}
      />
      {value && (
        <button
          data-part="search-clear"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
        >
          <Icon name="x-mark" size={13} />
        </button>
      )}
    </search>
  );
}
