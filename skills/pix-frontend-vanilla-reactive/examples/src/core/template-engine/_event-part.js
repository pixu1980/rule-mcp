// ═══════════════════════════════════════════════════════════════════════════════
//  EventPart — handles @eventname="handler(args)" in all 3 patterns
//  ═══════════════════════════════════════════════════════════════════════════════
//  Resolves handler names via _scope → _context → component instance.
//  Supports any DOM event (@click, @submit, @input, @mouseenter, …).
//  ═══════════════════════════════════════════════════════════════════════════════

import { evaluateExpression } from './_expression-parser.js';

/**
 * EventPart — resolves @eventname="handler(args)" at render-time.
 *
 * Resolution chain for handler name:
 *   1. result._scope[name]
 *   2. result._context[name]
 *   3. component instance (this, set by vrComponent)
 *
 * Args are evaluated EAGERLY at render time against merged context.
 * $event is a reserved keyword → replaced at click-time with DOM Event.
 */
export class EventPart {
  /**
   * @param {HTMLElement} el - Element with the @event attribute
   * @param {string} eventName - Event name (click, submit, input, etc.)
   * @param {string} handlerName - Resolved function name
   * @param {Array<object>} [argExprs=[]] - Parsed arg expressions
   */
  constructor(el, eventName, handlerName, argExprs = []) {
    this.element = el;
    this.eventName = eventName;
    this.handlerName = handlerName;
    this.argExprs = argExprs;          // parsed expression objects
    this._resolvedHandler = null;      // set by setContext()
    this._resolvedArgs = [];           // set by setContext() (eager)
    this._listener = null;
  }

  /**
   * Set the scope and context for this handler.
   * Resolves args eagerly at render-time.
   * Called by TemplateInstance.updateWithContext().
   *
   * @param {object} scope - The _scope object
   * @param {object} context - The _context object
   */
  setContext(scope, context) {
    // Resolve handler name: scope[name] → context[name]
    this._resolvedHandler =
      (scope && scope[this.handlerName]) ||
      (context && context[this.handlerName]);

    // Resolve args eagerly (except $event which is click-time)
    this._resolvedArgs = this.argExprs.map(expr => {
      const raw = expr?.variable || expr?.name || '';
      if (raw === '$event') return '$event';  // sentinel for click-time
      return evaluateExpression(expr, context, scope);
    });
  }

  /**
   * Bind the click listener.
   * Called ONCE after setContext sets the handler + args.
   * Called separately because TemplateInstance needs to bind after DOM clone.
   */
  bind() {
    if (this._listener) return; // already bound
    if (typeof this._resolvedHandler !== 'function') {
      console.warn('vr: handler not found:', this.handlerName);
      return;
    }

    this._listener = (event) => {
      // Replace $event sentinels with the native DOM event
      const args = this._resolvedArgs.map(a => a === '$event' ? event : a);
      // If no args and handler expects event, auto-inject it
      if (args.length === 0) {
        args.push(event);
      }
      this._resolvedHandler(...args);
    };

    this.element.addEventListener(this.eventName, this._listener);
  }

  /**
   * Cleanup — remove event listener.
   */
  dispose() {
    if (this._listener) {
      this.element.removeEventListener(this.eventName, this._listener);
      this._listener = null;
    }
  }
}
