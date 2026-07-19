// ═══════════════════════════════════════════════════════════════════════════════
//  Pattern Functional Component — list app
//  ═══════════════════════════════════════════════════════════════════════════════
//  Uses store.tick (automatic) instead of manual tickState.

import { Store, effect, html, render } from '../../src/core/index.js';

const store = new Store({ items: ['Pix', 'Vanilla', 'Reactive'] });

const addItem = () => {
  const title = prompt('New item:')?.trim();
  if (title) store.state.items = [...store.state.items, title];
};
const removeItem = (id) => {
  store.state.items = store.state.items.filter((_, i) => i !== id);
};

function ItemList(ctx) {
  const result = html`
    <section data-part="list">
      <for each="item in ctx.items">
        <article><span>{{ item }}</span><button @click="removeItem(_index)">✕</button></article>
      </for>
      <if condition="ctx.items.length === 0"><p>List is empty.</p></if>
      <button @click="addItem()">+ Add Item</button>
    </section>
  `;
  result._scope = { addItem, removeItem };
  result._context = ctx;
  return result;
}

effect(() => {
  store.tick.get();
  const ctx = { items: store.state.items };
  const result = ItemList(ctx);
  result._context = ctx;
  render(result, document.getElementById('root'));
});

store.tick.set(performance.now());
