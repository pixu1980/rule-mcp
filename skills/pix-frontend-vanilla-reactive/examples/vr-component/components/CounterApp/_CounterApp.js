// ═══════════════════════════════════════════════════════════════════════════════
//  App — CustomElement vrComponent (counter)
//  ═══════════════════════════════════════════════════════════════════════════════
//  Just html`` — vrComponent handles _context and _scope automatically.
//  ═══════════════════════════════════════════════════════════════════════════════

"use strict";
import { vrComponent, html } from "../../../../core/index.js";
import { store, increment, decrement, resetCount } from "../../_store.js";

export class CounterApp extends HTMLElement {
  static {
    vrComponent(this, { tag: "counter-app", css: import.meta.url });
  }

  increment() {
    increment();
  }

  decrement() {
    decrement();
  }

  resetCount() {
    resetCount();
  }

  context() {
    return { count: store.state.count };
  }

  render(ctx) {
    return html`
      <section data-part="counter">
        <p data-part="value">Count: <strong>{{ count }}</strong></p>
        <button data-part="btn" @click="increment()">+1</button>
        <button data-part="btn" @click="decrement()">-1</button>
        <button data-part="btn" @click="resetCount()">Reset</button>
      </section>
    `;
  }
}
