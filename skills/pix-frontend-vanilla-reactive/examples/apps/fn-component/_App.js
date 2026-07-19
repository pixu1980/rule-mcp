// ═══════════════════════════════════════════════════════════════════════════════
//  App — Functional Component (list manager)
//  ═══════════════════════════════════════════════════════════════════════════════
//  Mount effect: store.tick → render ItemList into DOM.
//  ═══════════════════════════════════════════════════════════════════════════════

import { effect, render } from '../../src/core/index.js';
import { store } from './_store.js';
import { ItemList } from './_components.js';

effect(() => {
  store.tick.get();
  const ctx = { items: store.state.items };
  render(ItemList(ctx), document.getElementById('root'));
});
