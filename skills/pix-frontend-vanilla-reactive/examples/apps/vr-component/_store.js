// ═══════════════════════════════════════════════════════════════════════════════
//  Shared store — vr-component example
//  ═══════════════════════════════════════════════════════════════════════════════

import { Store } from '../../src/core/index.js';

export const store = new Store({ count: 0 });

export const increment = () => { store.state.count++; };
export const decrement = () => { store.state.count--; };
export const resetCount = () => { store.state.count = 0; };
