// ═══════════════════════════════════════════════════════════════════════════════
//  Helpers: withContext, compose — reduce boilerplate for all patterns
//  ═══════════════════════════════════════════════════════════════════════════════
//
//  Pattern B — functional component:
//    return withContext(html`<button @click="fn">{{ x }}</button>`, ctx, { fn });
//
//  Pattern A/C — Custom Element render():
//    return withContext(TEMPLATE, ctx, this);   // scope = component instance
//    return withContext(TEMPLATE, ctx);          // scope = this (auto from vrComponent)
//
//  compose — shorthand for Pattern B with context merging:
//    return compose(html`...`, ctx, { fn });
//    // same as withContext but _context = { ...ctx, ...extra }
//  ═══════════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Use the `template:` option in vrComponent() instead.
 * Attach context and scope to a TemplateResult and return it.
 * Kept for backward compatibility.
 *
 * @param {{ kind: string, strings: string[], values: any[] }} result - TemplateResult
 * @param {object} [ctx] - Data context for {{ }} expressions
 * @param {object} [scope] - Function scope for @click="handler" resolution
 * @returns {{ kind: string, strings: string[], values: any[], _context: object, _scope: object }}
 */
export function withContext(result, ctx, scope) {
  if (result) {
    result._context = ctx || null;
    result._scope = scope || null;
  }
  return result;
}

/**
 * @deprecated Use the `template:` option in vrComponent() instead.
 * Shorthand: html + context + scope in one call.
 *
 * @param {{ kind: string, strings: string[], values: any[] }} result - TemplateResult
 * @param {object} [data] - Data for {{ }} expressions (becomes _context)
 * @param {object} [handlers] - Functions for @click="handler" (becomes _scope)
 * @returns {{ kind: string, strings: string[], values: any[], _context: object, _scope: object }}
 */
export function compose(result, data, handlers) {
  if (result) {
    result._context = data || null;
    result._scope = handlers || null;
  }
  return result;
}
