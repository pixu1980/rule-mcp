// ═══════════════════════════════════════════════════════════════════════════════
//  PART 1 — EffectCollector
// ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { withCollector } from "./_collector-context.js";
import { schedule } from "./_scheduler.js";

export class EffectCollector {
  constructor(fn) {
    this.fn = fn;

    this.deps = new Map();

    this.active = true;

    this.run = this.run.bind(this);

    this.run();
  }

  addDependency(sig) {
    if (this.deps.has(sig)) {
      return;
    }
    this.deps.set(
      sig,
      sig.subscribe(() => {
        schedule(this);
      }),
    );
  }

  cleanup() {
    for (const u of this.deps.values()) u();
    this.deps.clear();
  }

  run() {
    if (!this.active) {
      return;
    }
    this.cleanup();
    withCollector(this, () => {
      this.fn();
    });
  }

  stop() {
    this.active = false;
    this.cleanup();
  }
}
