// ═══════════════════════════════════════════════════════════════════════════════
//  PART 0 — Scheduler (microtask batching)
// ═══════════════════════════════════════════════════════════════════════════════

"use strict";

const scheduled = new Set();

let flushing = false;

export function schedule(job) {
  scheduled.add(job);

  if (flushing) {
    return;
  }

  flushing = true;
  queueMicrotask(() => {
    try {
      while (scheduled.size > 0) {
        const batch = [...scheduled];

        scheduled.clear();

        for (const j of batch) {
          j.run();
        }
      }
    } finally {
      flushing = false;
    }

  });
}
