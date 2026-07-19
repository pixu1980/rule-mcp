// ═══════════════════════════════════════════════════════════════════════════════
//  Shared store — vr-component example
//  ═══════════════════════════════════════════════════════════════════════════════

'use strict';
import { Store } from '../../core/index.js';

/** Shared counter store. Mutations auto-fire store.tick for reactivity. */
export const store = new Store({ count: 0 });

/** Increment counter by 1. */
export const increment = () => { store.state.count++; };

/** Decrement counter by 1. */
export const decrement = () => { store.state.count--; };

/** Reset counter to 0. */
export const resetCount = () => { store.state.count = 0; };
