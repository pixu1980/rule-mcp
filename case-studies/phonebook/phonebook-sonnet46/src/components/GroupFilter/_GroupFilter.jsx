/**
 * @file src/components/GroupFilter/_GroupFilter.jsx
 * @description Horizontal pill tabs for filtering contacts by group.
 * Active tab has an accent background; the rest are transparent.
 */
import { useEffect } from "react";
import cssText from "./_GroupFilter.css?raw";
import { adoptSheet } from "../../helpers/index.js";

/** @type {CSSStyleSheet} */
const _sheet = (() => {
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  return s;
})();

/** @type {{id: string, label: string}[]} */
const GROUPS = [
  { id: "all",       label: "All"       },
  { id: "favorites", label: "Favorites" },
  { id: "family",    label: "Family"    },
  { id: "friends",   label: "Friends"   },
  { id: "work",      label: "Work"      },
];

/**
 * @param {{ active: string, onChange: (id: string) => void }} props
 */
export function GroupFilter({ active, onChange }) {
  useEffect(() => {
    adoptSheet(_sheet);
  }, []);

  return (
    <nav data-part="group-filter" aria-label="Filter contacts by group">
      {GROUPS.map(({ id, label }) => (
        <button
          key={id}
          data-part="group-tab"
          data-active={active === id ? "" : undefined}
          onClick={() => onChange(id)}
          aria-pressed={active === id}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
