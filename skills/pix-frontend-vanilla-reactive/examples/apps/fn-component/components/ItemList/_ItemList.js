// ═══════════════════════════════════════════════════════════════════════════════
//  Functional Component: ItemList — fn-component example
//  ═══════════════════════════════════════════════════════════════════════════════
//  Pure function returning html``. No wrapper, no scope — caller provides them.
//  ═══════════════════════════════════════════════════════════════════════════════

import { html } from '../../../../../core/index.js';

/**
 * Render an editable list of text items.
 * Context and scope are attached by the caller (effect or parent CE).
 * @param {object} ctx - { items: string[] }
 * @returns {TemplateResult}
 */
export function ItemList(ctx) {
  return html`
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
  `;
}
