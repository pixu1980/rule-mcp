// ═══════════════════════════════════════════════════════════════════════════════
//  Functional Component: ItemList — fn-component example
//  ═══════════════════════════════════════════════════════════════════════════════
//  Pure function returning TemplateResult. No lifecycle, no HTMLElement.
//  Composable via {{ ItemList(ctx) }}.
//  ═══════════════════════════════════════════════════════════════════════════════

import { html, compose } from '../../src/core/index.js';
import { addItem, removeItem } from './_store.js';

/**
 * Render an editable list of text items.
 * @param {object} ctx - { items: string[] }
 * @returns {TemplateResult}
 */
export function ItemList(ctx) {
  return compose(html`
    <section data-part="list">
      <for each="item in ctx.items">
        <article data-part="row">
          <span data-part="text">{{ item }}</span>
          <button data-part="remove" @click="removeItem(_index)">✕</button>
        </article>
      </for>
      <if condition="ctx.items.length === 0">
        <p data-part="empty">List is empty.</p>
      </if>
      <button data-part="add" @click="addItem()">+ Add</button>
    </section>
  `, ctx, { addItem, removeItem });
}
