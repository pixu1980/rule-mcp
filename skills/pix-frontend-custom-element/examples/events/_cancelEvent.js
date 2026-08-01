// @ts-check

/**
 * Cancel a DOM event by optionally calling `preventDefault`, `stopPropagation`,
 * and `stopImmediatePropagation`. Returns `false` so handlers can use the
 * ergonomic `return cancelEvent(e)` pattern.
 *
 * @param {Event | null | undefined} e
 * @param {boolean} [preventDefault=true]
 * @param {boolean} [stopPropagation=true]
 * @param {boolean} [stopImmediatePropagation=true]
 * @returns {false | undefined}
 */
export const cancelEvent = (
  e,
  preventDefault = true,
  stopPropagation = true,
  stopImmediatePropagation = true
) => {
  if (!e) return;

  preventDefault && e.preventDefault();
  stopPropagation && e.stopPropagation();
  stopImmediatePropagation && e.stopImmediatePropagation();

  return false;
};
