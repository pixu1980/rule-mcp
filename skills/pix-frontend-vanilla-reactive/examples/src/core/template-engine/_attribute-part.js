// ═══════════════════════════════════════════════════════════════════════════════
//  AttributePart
//  ═══════════════════════════════════════════════════════════════════════════════
//   model directive removed. Use @input for two-way binding.
//  ═══════════════════════════════════════════════════════════════════════════════

import { Part } from './_part.js';
import { isSignalLike } from '../signals/index.js';

export class AttributePart extends Part {
  constructor(el, name) {
    super();
    this.element = el;
    this.name = name;
  }

  setValue(value) {
    if (isSignalLike(value)) {
      this.disposeSignal();
      this.bindSignal(value, (r) => this.commit(r));
      return;
    }
    this.disposeSignal();
    this.commit(value);
  }

  commit(value) {
    if (value == null || value === false) {
      this.element.removeAttribute(this.name);
      return;
    }
    this.element.setAttribute(this.name, value === true ? '' : String(value));
  }
}
