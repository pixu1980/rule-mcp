// ═══════════════════════════════════════════════════════════════════════════════
//  Shared store — fn-component example
//  ═══════════════════════════════════════════════════════════════════════════════

import { Store } from '../../src/core/index.js';

export const store = new Store({ items: ['Pix', 'Vanilla', 'Reactive'] });

export const addItem = () => {
  const title = prompt('New item:')?.trim();
  if (title) store.state.items = [...store.state.items, title];
};

export const removeItem = (id) => {
  store.state.items = store.state.items.filter((_, i) => i !== id);
};
