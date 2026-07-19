// ═══════════════════════════════════════════════════════════════════════════════
//  App — CustomElement vrComponent (counter)
//  ═══════════════════════════════════════════════════════════════════════════════
//  Demonstrates Pattern CustomElement vrComponent with @click handlers,
//  automatic store.tick, and vrComponent decorator.
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html, withContext } from '../../src/core/index.js';
import { store, increment, decrement, resetCount } from './_store.js';

/**
 * Counter app — custom element with reactive store binding.
 * Usage: <counter-app></counter-app>
 */
export class CounterApp extends HTMLElement {
  static { vrComponent(this, { tag: 'counter-app' }); }

  /** @click handler */
  increment() { increment(); }
  /** @click handler */
  decrement() { decrement(); }
  /** @click handler */
  resetCount() { resetCount(); }

  /** @returns {{ count: number }} */
  context() { return { count: store.state.count }; }

  /** @param {{ count: number }} ctx */
  render(ctx) {
    return withContext(html`
      <section data-part="counter">
        <p data-part="value">Count: <strong>{{ count }}</strong></p>
        <button data-part="btn" @click="increment()">+1</button>
        <button data-part="btn" @click="decrement()">-1</button>
        <button data-part="btn" @click="resetCount()">Reset</button>
      </section>
    `, ctx);
  }
}
