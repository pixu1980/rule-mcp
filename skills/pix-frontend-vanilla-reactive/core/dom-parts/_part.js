// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3c — Part base class
// ═══════════════════════════════════════════════════════════════════════════════

'use strict';
import { isSignalLike } from '../signals/index.js';

export class Part {
  constructor() { this.value = undefined; this.signalCleanup = null; }
  bindSignal(sig, cb) { this.disposeSignal(); this.signalCleanup = sig.subscribe(() => cb(sig.get())); cb(sig.get()); }
  disposeSignal() { if (this.signalCleanup) { this.signalCleanup(); this.signalCleanup = null; } }
}
