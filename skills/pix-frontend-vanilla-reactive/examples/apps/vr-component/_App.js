// ═══════════════════════════════════════════════════════════════════════════════
//  App — CustomElement vrComponent (counter)
//  ═══════════════════════════════════════════════════════════════════════════════
//  Store + vrComponent in one module. store.tick is automatic.

import { Store, vrComponent, html } from '../../src/core/index.js';

const store = new Store({ count: 0 });

export class CounterApp extends HTMLElement {
  static { vrComponent(this, { tag: 'counter-app' }); }

  increment() { store.state.count++; }
  decrement() { store.state.count--; }
  reset()     { store.state.count = 0; }
  context()   { return { count: store.state.count }; }

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
