// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3 — Template Engine: Directive system + html tag
// ═══════════════════════════════════════════════════════════════════════════════

const directiveBrand = Symbol("directive");
export function directive(name, payload) {
  return { [directiveBrand]: true, name, payload };
}
export function isDirective(value, name) {
  return Boolean(value?.[directiveBrand] && (!name || value.name === name));
}
export function html(strings, ...values) {
  return { kind: "template-result", strings, values };
}
export function model(config) {
  return directive("model", config);
}
export function repeat(items, key, renderItem) {
  return directive("repeat", { items, key, renderItem });
}
