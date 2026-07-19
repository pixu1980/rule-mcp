// ═══════════════════════════════════════════════════════════════════════════════
//  App — Functional Component bootstrap
//  ═══════════════════════════════════════════════════════════════════════════════
//  Mounts the reactive effect. Loads CSS via fetch + adoptedStyleSheets.
//  Context + scope passed to render().
//  ═══════════════════════════════════════════════════════════════════════════════

import { effect, render } from '../../core/index.js';
import { store, addItem, removeItem } from './_store.js';
import { ItemList } from './components/ItemList/index.js';

// Load CSS (Pattern B has no vrComponent — load manually)
const cssUrl = new URL('./_style.css', import.meta.url);
const sheet = new CSSStyleSheet();
sheet.replaceSync(await (await fetch(cssUrl)).text());
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

effect(() => {
  store.tick.get();
  const ctx = { items: store.state.items };
  render(ItemList(ctx), document.getElementById('root'), ctx, { addItem, removeItem });
});
