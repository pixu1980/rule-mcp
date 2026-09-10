

/**
 * @module cli/setup/use-selection
 *
 * Cursor and selection state for a list, with the key bindings that drive it.
 *
 * Section headings live in the same array as the entries so the list renders
 * in one pass; the cursor has to step over them, which is why moving is a
 * search for the next selectable index rather than an increment.
 */

import { useCallback, useInput, useMemo, useRef, useState } from "./_h.js";

/** Indices of rows the cursor may land on. */
const selectableIndexes = (items) => items.map((item, index) => (item.section ? -1 : index)).filter((index) => index >= 0);

/**
 * @param {object[]} items - entries and `{ section: true }` headings
 * @param {{ initial?: string[], mode?: "check"|"radio", onSubmit?: Function, onBack?: Function }} options
 */
export function useSelection(items, { initial = [], mode = "check", onSubmit, onBack } = {}) {
  const indexes = useMemo(() => selectableIndexes(items), [items]);
  // The cursor lives in a ref as well as state. A burst of keystrokes is
  // delivered before React re-renders, and reading the position from state
  // would make every key in the burst act on the same stale index - twenty
  // presses of Down would move one row.
  const cursorRef = useRef(indexes[0] ?? 0);
  const [cursor, setCursor] = useState(cursorRef.current);
  const [selected, setSelected] = useState(() => new Set(initial));

  const move = useCallback(
    (delta) => {
      const position = indexes.indexOf(cursorRef.current);
      const next = (position + delta + indexes.length) % indexes.length;

      cursorRef.current = indexes[next];
      setCursor(cursorRef.current);
    },
    [indexes],
  );

  const toggle = useCallback(
    (id) => {
      setSelected((current) => {
        if (mode === "radio") {
          return new Set([id]);
        }

        const next = new Set(current);

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      });
    },
    [mode],
  );

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      move(-1);
    } else if (key.downArrow || input === "j") {
      move(1);
    } else if (input === " ") {
      toggle(items[cursorRef.current]?.id);
    } else if (input === "a" && mode === "check") {
      setSelected(new Set(indexes.map((index) => items[index].id)));
    } else if (input === "n" && mode === "check") {
      setSelected(new Set());
    } else if (/^[1-9]$/.test(input)) {
      // Number keys jump and toggle in one keystroke, as the shell picker did.
      const target = indexes[Number(input) - 1];

      if (target !== undefined) {
        cursorRef.current = target;
        setCursor(target);
        toggle(items[target].id);
      }
    } else if (key.return) {
      onSubmit?.(mode === "radio" ? items[cursorRef.current]?.id : [...selected]);
    } else if (key.escape || key.leftArrow) {
      onBack?.();
    }
  });

  // In radio mode the highlighted row is the choice, so selection follows the
  // cursor instead of waiting for a separate toggle.
  const effective = mode === "radio" ? new Set([items[cursor]?.id]) : selected;

  return { cursor, selected: effective, current: items[cursor] };
}
