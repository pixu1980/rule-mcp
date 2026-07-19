// ═══════════════════════════════════════════════════════════════════════════════
//  PART 0 — Collector Context
// ═══════════════════════════════════════════════════════════════════════════════

"use strict";

const collectorStack = [];

export function getCurrentCollector() {
  return collectorStack[collectorStack.length - 1];
}

export function pushCollector(c) {
  collectorStack.push(c);
}

export function popCollector() {
  return collectorStack.pop();
}

export function withCollector(collector, fn) {
  pushCollector(collector);

  try {
    return fn();
  } finally {
    popCollector();
  }

}

export function withoutCollector(callback) {
  const current = popCollector();

  try {
    return callback();
  } finally {
    if (current) {
      pushCollector(current);
    }
  }

}
