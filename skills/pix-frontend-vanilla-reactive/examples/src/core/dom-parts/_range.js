// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3b — Range / DOM helpers
// ═══════════════════════════════════════════════════════════════════════════════

export function clearRange(start, end) {
  let c = start.nextSibling;
  while (c && c !== end) { const n = c.nextSibling; c.remove(); c = n; }
}
export function moveRangeBefore(start, end, ref) {
  const f = document.createDocumentFragment();
  let c = start;
  while (c) { const n = c.nextSibling; f.append(c); if (c === end) break; c = n; }
  ref.parentNode.insertBefore(f, ref);
}
export function isRangeBeforeReference(start, end, ref) {
  let c = start;
  while (c) { if (c === ref) return false; if (c === end) return c.nextSibling === ref; c = c.nextSibling; }
  return false;
}
export function normalizeExprValue(value, useRaw) {
  if (value == null) return document.createTextNode('');
  if (value instanceof Node) return value;
  if (useRaw && typeof value === 'string') {
    const t = document.createElement('template'); t.innerHTML = value;
    const f = document.createDocumentFragment();
    while (t.content.firstChild) f.append(t.content.firstChild);
    return f;
  }
  return document.createTextNode(String(value));
}
export function inferModelProperty(el) {
  return el instanceof HTMLInputElement && el.type === 'checkbox' ? 'checked' : 'value';
}
