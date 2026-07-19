// ═══════════════════════════════════════════════════════════════════════════════
//  PART 1 — StateSignal
// ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { BaseSignal } from "./_base-signal.js";

export class StateSignal extends BaseSignal {
  constructor(value, opts = {}) {

    super();

    this.value = value;

    this.equals = opts.equals ?? Object.is;

  }

  get() {
    this.track();

    return this.value;
  }

  peek() {
    return this.value;
  }

  set(next) {
    if (this.equals(this.value, next)) { return this.value; }
    this.value = next;
    this.notify();

    return this.value;
  }
}

