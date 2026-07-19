// ═══════════════════════════════════════════════════════════════════════════════
//  App — Functional Component bootstrap
//  ═══════════════════════════════════════════════════════════════════════════════
//  Mounts the reactive effect. CSS via loadCSS helper.
//  Context + scope passed to render().
//  ═══════════════════════════════════════════════════════════════════════════════

import { effect, render, loadCSS } from '../../core/index.js';
import { store, addItem, removeItem } from './_store.js';
import { ItemList } from './components/ItemList/index.js';

await loadCSS(new URL('./_App.css', import.meta.url));

effect(() => {
  store.tick.get();
  const ctx = { items: store.state.items };
  render(ItemList(ctx), document.getElementById('root'), ctx, { addItem, removeItem });
});
