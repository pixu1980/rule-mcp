// ═══════════════════════════════════════════════════════════════════════════════
//  App — CustomElement vrComponent (counter)
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html, withContext } from '../../src/core/index.js';
import { store, increment, decrement, resetCount } from './_store.js';

export class CounterApp extends HTMLElement {
  static { vrComponent(this, { tag: 'counter-app' }); }

  increment() { increment(); }
  decrement() { decrement(); }
  resetCount() { resetCount(); }

  context() { return { count: store.state.count }; }

  render(ctx) {
    return withContext(html`
      <section>
        <p>Count: <strong>{{ count }}</strong></p>
        <button @click="increment()">+1</button>
        <button @click="decrement()">-1</button>
        <button @click="resetCount()">Reset</button>
      </section>
    `, ctx);  // _scope = this (auto by vrComponent)
  }
}
