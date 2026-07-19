// ═══════════════════════════════════════════════════════════════════════════════
//  App — Functional Component bootstrap
//  ═══════════════════════════════════════════════════════════════════════════════
//  Mounts to document.body by default.
//  Pass a different container as 2nd arg to render() to override.
//  ═══════════════════════════════════════════════════════════════════════════════

import { effect, render, loadCSS } from '../../core/index.js';
import { store, addItem, removeItem } from './_store.js';
import { ItemList } from './components/ItemList/index.js';

await loadCSS(new URL('./_App.css', import.meta.url));

effect(() => {
  store.tick.get();
  const ctx = { items: store.state.items };
  render(ItemList(ctx), document.body, ctx, { addItem, removeItem });
});
