// ═══════════════════════════════════════════════════════════════════════════════
//  Shared store — fn-component example
//  ═══════════════════════════════════════════════════════════════════════════════

'use strict';
import { Store } from '../../core/index.js';

/** Shared items store. */
export const store = new Store({ items: ['Pix', 'Vanilla', 'Reactive'] });

/** Prompt user for a new item and append to list. */
export const addItem = () => {
  const title = prompt('New item:')?.trim();

  if (title) store.state.items = [...store.state.items, title];
};

/**
 * Remove item at index.
 * @param {number} id - Array index to remove
 */
export const removeItem = (id) => {
  store.state.items = store.state.items.filter((_, i) => i !== id);
};
