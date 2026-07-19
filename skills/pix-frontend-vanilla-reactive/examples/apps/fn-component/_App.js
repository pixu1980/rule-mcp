// ═══════════════════════════════════════════════════════════════════════════════
//  App — Functional Component (list manager)
//  ═══════════════════════════════════════════════════════════════════════════════
//  Store + effect + pure functions. No classes. No HTMLElement.
//  store.tick is automatic — no manual tickState.
//  ═══════════════════════════════════════════════════════════════════════════════

import { Store, effect, html, render, compose } from '../../src/core/index.js';

const store = new Store({ items: ['Pix', 'Vanilla', 'Reactive'] });

// ── Handlers ───────────────────────────────────────────────────
const addItem = () => {
  const title = prompt('New item:')?.trim();
  if (title) store.state.items = [...store.state.items, title];
};
const removeItem = (id) => {
  store.state.items = store.state.items.filter((_, i) => i !== id);
};

// ── Functional component ───────────────────────────────────────
function ItemList(ctx) {
  return compose(html`
    <section>
      <for each="item in ctx.items">
        <article><span>{{ item }}</span><button @click="removeItem(_index)">✕</button></article>
      </for>
      <if condition="ctx.items.length === 0"><p>List is empty.</p></if>
      <button @click="addItem()">+ Add</button>
    </section>
  `, ctx, { addItem, removeItem });
}

// ── Mount effect ────────────────────────────────────────────────
effect(() => {
  store.tick.get();
  const ctx = { items: store.state.items };
  render(ItemList(ctx), document.getElementById('root'));
});
