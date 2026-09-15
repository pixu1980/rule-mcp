

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
const selectableIndexes = (items) =>
  items.map((item, index) => (item.section ? -1 : index)).filter((index) => index >= 0);

/**
 * Where the cursor starts.
 *
 * In radio mode the highlighted row is the choice, so a cursor that ignored
 * the incoming value would silently answer the question with row one - a
 * daemon install offered stdio, a standard preset offered minimal.
 *
 * @param {object[]} items
 * @param {number[]} indexes - the rows the cursor may land on
 * @param {string[]} initial
 * @param {"check"|"radio"} mode
 * @returns {number}
 */
export function initialCursor(items, indexes, initial = [], mode = "check") {
  const preselected = mode === "radio" ? indexes.find((index) => initial.includes(items[index]?.id)) : undefined;

  return preselected ?? indexes[0] ?? 0;
}

/**
 * The ids a tick can actually apply to.
 *
 * A disabled row stays reachable so its detail panel can explain why it is
 * disabled, but it cannot be selected: a tick the plan then ignores is a
 * promise the install does not keep.
 *
 * @param {object[]} items
 * @returns {string[]}
 */
export const enabledIds = (items) => items.filter((item) => !item.section && !item.disabled).map((item) => item.id);

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
  const cursorRef = useRef(initialCursor(items, indexes, initial, mode));
  const [cursor, setCursor] = useState(cursorRef.current);
  const allowed = useMemo(() => new Set(enabledIds(items)), [items]);
  const [selected, setSelected] = useState(() => new Set(initial.filter((id) => allowed.has(id))));

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
      if (!allowed.has(id)) {
        return;
      }

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
    [allowed, mode],
  );

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      move(-1);
    } else if (key.downArrow || input === "j") {
      move(1);
    } else if (input === " ") {
      toggle(items[cursorRef.current]?.id);
    } else if (input === "a" && mode === "check") {
      setSelected(new Set(indexes.map((index) => items[index].id).filter((id) => allowed.has(id))));
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
