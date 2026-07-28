// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3c — EventPart
// ═══════════════════════════════════════════════════════════════════════════════

export class EventPart {
  constructor(el, name) { this.element = el; this.name = name; this.listener = null; }
  setValue(value) {
    if (this.listener) { this.element.removeEventListener(this.name, this.listener); this.listener = null; }
    if (typeof value !== 'function') return;
    this.listener = value;
    this.element.addEventListener(this.name, this.listener);
  }
}
