// ═══════════════════════════════════════════════════════════════════════════════
//  App — Functional Component bootstrap
//  ═══════════════════════════════════════════════════════════════════════════════
//  Mounts the reactive effect: store.tick → render ItemList into #root.
//  No exports — imported by index.js for its side effect.
//  ═══════════════════════════════════════════════════════════════════════════════

import { effect, render } from '../../src/core/index.js';
import { store } from './_store.js';
import { ItemList } from './_components.js';

effect(() => {
  store.tick.get();
  const ctx = { items: store.state.items };
  render(ItemList(ctx), document.getElementById('root'));
});
