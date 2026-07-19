// ═══════════════════════════════════════════════════════════════════════════════
//  Pattern CustomElement vrComponent — counter app
//  ═══════════════════════════════════════════════════════════════════════════════
//  Uses store.tick (automatic) instead of manual tickState.

import { Store, effect, vrComponent, html, render } from '../../src/core/index.js';

const store = new Store({ count: 0 });  // auto-creates store.tick

class CounterApp extends HTMLElement {
  static { vrComponent(this, { tag: 'counter-app' }); }
  increment() { store.state.count++; }
  decrement() { store.state.count--; }
  reset()     { store.state.count = 0; }
  context() { return { count: store.state.count }; }
  render(ctx) {
    return html`
      <section>
        <p>Count: <strong>{{ count }}</strong></p>
        <button @click="increment()">+1</button>
        <button @click="decrement()">-1</button>
        <button @click="reset()">Reset</button>
      </section>
    `;
  }
}

store.tick.set(performance.now());
