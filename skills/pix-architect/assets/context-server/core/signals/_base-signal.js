// ═══════════════════════════════════════════════════════════════════════════════
//  PART 1 — BaseSignal
// ═══════════════════════════════════════════════════════════════════════════════

import { getCurrentCollector } from './_collector-context.js';

export class BaseSignal {
  constructor() { this.subscribers = new Set(); this.__isSignal = true; }
  subscribe(fn) { this.subscribers.add(fn); return () => this.subscribers.delete(fn); }
  track() { const c = getCurrentCollector(); if (c) c.addDependency(this); }
  notify() { for (const s of [...this.subscribers]) s(); }
}
