// ═══════════════════════════════════════════════════════════════════════════════
//  Signals public API
// ═══════════════════════════════════════════════════════════════════════════════

import { BaseSignal } from './_base-signal.js';
import { StateSignal } from './_state-signal.js';
import { ComputedSignal } from './_computed-signal.js';
import { EffectCollector } from './_effect-collector.js';
import { withCollector, withoutCollector, getCurrentCollector, pushCollector, popCollector } from './_collector-context.js';
import { schedule } from './_scheduler.js';

export {
  BaseSignal,
  StateSignal,
  ComputedSignal,
  EffectCollector,
  schedule,
  withCollector,
  withoutCollector,
  getCurrentCollector,
  pushCollector,
  popCollector,
};

export const Signal = {
  State: StateSignal,
  Computed: ComputedSignal,
  subtle: {
    untrack: (fn) => { const c = popCollector(); try { return fn(); } finally { if (c) pushCollector(c); } },
  },
};

// Re-exports of the original demo.js functions
export function effect(fn) { const c = new EffectCollector(fn); return () => c.stop(); }
export function isSignalLike(v) { return Boolean(v && typeof v.get === 'function' && v.__isSignal); }
