// ═══════════════════════════════════════════════════════════════════════════════
//  pattern CustomElement vrComponent with External HTMLustomElement vrComponent with External HTMLustomElement vrComponent — Custom Element + vrComponent (counter app)
//  ═══════════════════════════════════════════════════════════════════════════════
//  Everything is in one class. vrComponent handles define, CSS, reactive loop.
//  Methods = @click handlers. context() = data. render() = template.
//  ═══════════════════════════════════════════════════════════════════════════════

import { Store, Signal, vrComponent, html } from '../../src/core/index.js';

// ── Store + TickState ──────────────────────────────────────────
const store = new Store({ count: 0 });
const tickState = new Signal.State(0, { equals: () => false });
window.addEventListener('store:change', () => tickState.set(performance.now()));

// ── Component ──────────────────────────────────────────────────
class CounterApp extends HTMLElement {
  static { vrComponent(this, { tag: 'counter-app' }); }

  // @click handlers — auto-resolved via _scope = this
  increment() { store.state.count++; }
  decrement() { store.state.count--; }
  reset()     { store.state.count = 0; }

  // Data for {{ }} expressions — called each render cycle
  context() {
    return { count: store.state.count };
  }

  // Template — called each render cycle
  render(ctx) {
    return html`
      <section data-part="counter">
        <p data-part="value">Count: <strong>{{ count }}</strong></p>
        <button @click="increment()">+1</button>
        <button @click="decrement()">-1</button>
        <button @click="reset()">Reset</button>
      </section>
    `;
  }
}

// ── Kick ────────────────────────────────────────────────────────
tickState.set(performance.now());
