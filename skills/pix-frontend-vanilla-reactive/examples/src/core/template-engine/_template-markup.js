// Template Engine - Markup assembly (attr/val markers, directives, {{ }} exprs)

import { parseExpression } from "./_expression-parser.js";

const ATTR_END_RE = /([.@]?[-\w:]+)\s*=\s*(?:"|'|)?$/;

/**
 * Build cleaned markup plus directive/expr metadata for getTemplate.
 * @param {TemplateStringsArray} strings
 * @returns {{ processed: string, directives: object[], allExprMarkers: object[], exprCounter: number }}
 */
export function buildTemplateMarkup(strings) {
  // Step 1: Assemble full HTML - use __attr_N__ for attribute positions,
  //         <!--val:N--> for child positions (--> breaks HTML attribute parsing)
  let markup = "";
  for (let i = 0; i < strings.length - 1; i++) {
    const chunk = strings[i];
    markup += chunk;
    if (ATTR_END_RE.test(chunk)) {
      markup += `__attr_${i}__`;
    } else {
      markup += `<!--val:${i}-->`;
    }
  }
  markup += strings[strings.length - 1];

  // Step 2: Extract <for>, <if> directive regions from markup
  const directives = [];
  let cleanedMarkup = markup;
  let directiveIdCounter = 0;

  cleanedMarkup = cleanedMarkup.replace(/<for\s+([^>]*)>([\s\S]*?)<\/for>/gi, (full, attrs, inner) => {
    const id = directiveIdCounter++;
    const eachMatch = attrs.match(/each\s*="([^"]*)"/);
    // render= carries a __attr_N__ marker (function reference)
    const renderMatch = attrs.match(/render\s*=\s*__attr_(\d+)__/);
    directives.push({
      kind: "for",
      id,
      each: eachMatch ? eachMatch[1] : "",
      inner,
      renderAttrIdx: renderMatch ? Number(renderMatch[1]) : -1,
    });
    return `<!--dir:${id}-->`;
  });
  cleanedMarkup = cleanedMarkup.replace(/<if\s+([^>]*)>([\s\S]*?)<\/if>/gi, (full, attrs, inner) => {
    const id = directiveIdCounter++;
    const condMatch = attrs.match(/condition\s*="([^"]*)"/);
    directives.push({ kind: "if", id, condition: condMatch ? condMatch[1] : "", inner });
    return `<!--dir:${id}-->`;
  });

  // Step 3: Replace {{ expr }} with <!--expr:IDX--> markers
  let exprCounter = 0;
  const allExprMarkers = [];
  let processed = "";
  let lastIdx = 0;
  const reExpr = /\{\{([^}]+)\}\}/g;
  let mExpr;
  while ((mExpr = reExpr.exec(cleanedMarkup)) !== null) {
    processed += cleanedMarkup.slice(lastIdx, mExpr.index);
    const idx = exprCounter++;
    processed += `<!--expr:${idx}-->`;
    allExprMarkers.push({ index: idx, parsedExpr: parseExpression(mExpr[1].trim()) });
    lastIdx = reExpr.lastIndex;
  }
  processed += cleanedMarkup.slice(lastIdx);

  return { processed, directives, allExprMarkers, exprCounter };
}
