// ═══════════════════════════════════════════════════════════════════════════════
//  PART 1 — ComputedSignal
// ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { BaseSignal } from "./_base-signal.js";
import { withCollector } from "./_collector-context.js";

export class ComputedSignal extends BaseSignal {
  constructor(compute, opts = {}) {
    super(); this.compute = compute; this.equals = opts.equals ?? Object.is;
    this.deps = new Map(); this.cached = undefined; this.dirty = true;
    this.recomputing = false; this.boundInvalidate = this.invalidate.bind(this);
  }

  addDependency(sig) {
    if (this.deps.has(sig)) { return; }
    this.deps.set(sig, sig.subscribe(this.boundInvalidate));
  }

  cleanupDeps() {
    for (const u of this.deps.values()) u();
    this.deps.clear();
  }

  invalidate() {
    if (this.dirty) {
      return;
    }
    this.dirty = true;
    this.notify();
  }

  evaluate() {
    if (!this.dirty) {
      return this.cached;
    }

    if (this.recomputing) {
      return this.cached;
    }

    this.recomputing = true; this.cleanupDeps();
    try {
      const next = withCollector(this, () => {
      this.compute();
    });
      if (this.dirty || !this.equals(this.cached, next)) {
      this.cached = next;
    }

      this.dirty = false; return this.cached;
    } finally { this.recomputing = false; }
  }

  get() {
    this.track();

    return this.evaluate();
  }

  peek() {
    return this.evaluate();
  }
}

