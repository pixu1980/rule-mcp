// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3c — AttributePart (includes model directive support)
// ═══════════════════════════════════════════════════════════════════════════════

import { Part } from './_part.js';
import { isDirective } from './_template-helpers.js';
import { isSignalLike } from '../signals/index.js';
import { inferModelProperty } from './_range.js';

export class AttributePart extends Part {
  constructor(el, name) { super(); this.element = el; this.name = name; this.modelCleanup = null; this._modelBinding = null; }
  setValue(value) {
    if (this.name === 'model' && isDirective(value, 'model')) { this.commitModel(value.payload); this.value = value; return; }
    if (isSignalLike(value)) { this.disposeModel(); this.bindSignal(value, (r) => this.commit(r)); return; }
    this.disposeModel(); this.disposeSignal(); this.commit(value);
  }
  commit(value) {
    if (value == null || value === false) { this.element.removeAttribute(this.name); return; }
    this.element.setAttribute(this.name, value === true ? '' : String(value));
  }
  commitModel(config) {
    const eventName = config.event ?? 'input';
    const property = config.prop ?? inferModelProperty(this.element);
    if (this._modelBinding && this._modelBinding.eventName === eventName && this._modelBinding.property === property && this._modelBinding.signal === config.signal) {
      this._modelBinding.config = config; this._modelBinding.sync(); return;
    }
    this.disposeSignal(); this.disposeModel();
    const binding = { config, eventName, property, signal: config.signal };
    const sync = () => {
      const next = binding.config.get();
      if (property === 'checked') { const nv = Boolean(next); if (this.element.checked !== nv) this.element.checked = nv; }
      else {
        const nv = next ?? '';
        if (this.element[property] === nv) return;
        const isActive = document.activeElement === this.element;
        const ss = typeof this.element.selectionStart === 'number' ? this.element.selectionStart : null;
        const se = typeof this.element.selectionEnd === 'number' ? this.element.selectionEnd : null;
        this.element[property] = nv;
        if (isActive && ss !== null && se !== null) {
          const len = String(nv).length;
          this.element.setSelectionRange(Math.min(ss, len), Math.min(se, len));
        }
      }
    };
    binding.sync = sync; this._modelBinding = binding;
    const onInput = (e) => { const t = e.currentTarget; binding.config.set(property === 'checked' ? t.checked : t[property]); };
    this.element.addEventListener(eventName, onInput);
    this.modelCleanup = () => { this.element.removeEventListener(eventName, onInput); this._modelBinding = null; };
    if (config.signal && isSignalLike(config.signal)) { this.bindSignal(config.signal, () => sync()); return; }
    sync();
  }
  disposeModel() { if (this.modelCleanup) { this.modelCleanup(); this.modelCleanup = null; } }
}
