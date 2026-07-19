// ═══════════════════════════════════════════════════════════════════════════════
//  App — Functional Component bootstrap
//  ═══════════════════════════════════════════════════════════════════════════════
//  Mounts the reactive effect. Context + scope passed to render().
//  ═══════════════════════════════════════════════════════════════════════════════

import { effect, render } from '../../core/index.js';
import { store, addItem, removeItem } from './_store.js';
import { ItemList } from './components/ItemList/index.js';

effect(() => {
  store.tick.get();
  const ctx = { items: store.state.items };
  render(ItemList(ctx), document.getElementById('root'), ctx, { addItem, removeItem });
});
