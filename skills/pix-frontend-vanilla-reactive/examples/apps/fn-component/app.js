// ═══════════════════════════════════════════════════════════════════════════════
//  Pattern Functional Component — Functional Component (greeting list)
//  ═══════════════════════════════════════════════════════════════════════════════
//  No classes, no HTMLElement. Pure functions returning html``.
//  Handlers passed via result._scope. Data via result._context.
//  Rendered into a plain <div> via render() + effect().
//  ═══════════════════════════════════════════════════════════════════════════════

import { Store, Signal, effect, html, render } from '../../src/core/index.js';

// ── Store + TickState ──────────────────────────────────────────
const store = new Store({ items: ['Pix', 'Vanilla', 'Reactive'] });
const tickState = new Signal.State(0, { equals: () => false });
window.addEventListener('store:change', () => tickState.set(performance.now()));

// ── Handlers (in scope for @click) ─────────────────────────────
const addItem = () => {
  const title = prompt('New item:')?.trim();
  if (title) store.state.items = [...store.state.items, title];
};
const removeItem = (id) => {
  store.state.items = store.state.items.filter((_, i) => i !== id);
};

// ── Functional component #1: list ───────────────────────────────
function ItemList(ctx) {
  const result = html`
    <section data-part="list">
      <for each="item in ctx.items">
        <article data-part="row">
          <span>{{ item }}</span>
          <button @click="removeItem(_index)">✕</button>
        </article>
      </for>
      <if condition="ctx.items.length === 0">
        <p data-part="empty">List is empty.</p>
      </if>
      <button @click="addItem()">+ Add Item</button>
    </section>
  `;
  result._scope = { addItem, removeItem };
  result._context = ctx;
  return result;
}

// ── Mount effect ────────────────────────────────────────────────
effect(() => {
  tickState.get();
  const ctx = { items: store.state.items };
  const result = ItemList(ctx);
  result._context = ctx;
  render(result, document.getElementById('root'));
});

tickState.set(performance.now());
