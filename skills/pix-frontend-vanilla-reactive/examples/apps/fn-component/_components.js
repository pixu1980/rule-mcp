// ═══════════════════════════════════════════════════════════════════════════════
//  Functional Component: ItemList — fn-component example
//  ═══════════════════════════════════════════════════════════════════════════════
//  Pure function returning TemplateResult. No lifecycle.
//  ═══════════════════════════════════════════════════════════════════════════════

import { html, compose } from '../../src/core/index.js';
import { addItem, removeItem } from './_store.js';

/**
 * Renders a list of items with add/remove controls.
 * @param {object} ctx - { items: string[] }
 * @returns {TemplateResult}
 */
export function ItemList(ctx) {
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
