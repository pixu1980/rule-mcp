// ═══════════════════════════════════════════════════════════════════════════════
//  Template Engine: html tag + helpers
// ═══════════════════════════════════════════════════════════════════════════════
//  Only {{ }}, <for>, <if>, @event, .prop — no ${}, no model, no repeat.
//  Two-way binding via @input + .value.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * html tagged template (or string) → TemplateResult.
 *
 * As tagged template:
 *   html`<h1>{{ title }}</h1>`
 *   → { kind: 'template-result', strings: ['<h1>{{ title }}</h1>'], values: [] }
 *
 * As regular function (pattern CustomElement vrComponent with External HTMLustomElement vrComponent with External HTML, from .template.html string):
 *   html('<h1>{{ title }}</h1>')
 *   → { kind: 'template-result', strings: ['<h1>{{ title }}</h1>'], values: [] }
 */
export function html(strings, ...values) {
  if (typeof strings === 'string') {
    return { kind: 'template-result', strings: [strings], values: [] };
  }
  return { kind: 'template-result', strings, values };
}
