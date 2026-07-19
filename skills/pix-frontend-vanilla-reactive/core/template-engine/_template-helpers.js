// ═══════════════════════════════════════════════════════════════════════════════
//  Template Engine: html tag + helpers
// ═══════════════════════════════════════════════════════════════════════════════
//  v2: ${} removed. Only {{ }}, <for>, <if>, @event, .prop remain.
//  Directive system (model, repeat) removed — use @input for two-way binding.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * html tagged template (or string) → TemplateResult.
 *
 * As tagged template:
 *   html`<h1>{{ title }}</h1>`
 *   → { kind: 'template-result', strings: ['<h1>{{ title }}</h1>'], values: [] }
 *
 * As regular function (Pattern CustomElement vrComponent with External HTML, from .template.html string):
 *   html('<h1>{{ title }}</h1>')
 *   → { kind: 'template-result', strings: ['<h1>{{ title }}</h1>'], values: [] }
 */
'use strict';

export function html(strings, ...values) {
  if (typeof strings === 'string') {
    return { kind: 'template-result', strings: [strings], values: [] };
  }
  return { kind: 'template-result', strings, values };
}

