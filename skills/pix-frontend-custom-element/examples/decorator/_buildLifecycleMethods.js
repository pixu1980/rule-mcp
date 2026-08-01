// @ts-check

import { strings } from './_utils.js';

/**
 * @typedef {EventTarget & {
 *   [key: string]: unknown,
 *   handleEvent?: (event: Event) => void,
 *   onAttributeChanged?: (name: string, oldValue: string | null, newValue: string | null) => void,
 *   onRender?: () => void,
 *   onConnected?: () => void,
 *   onDisconnected?: () => void,
 * }} DecoratedInstance
 */

/**
 * Build lifecycle methods and the `handleEvent` dispatcher for the prototype.
 *
 * Generated methods on the instance:
 * - `handleEvent(e)`: dispatches to `handle<PascalType>Event(e)` if present.
 * - `attributeChangedCallback(name, oldValue, newValue)`: dispatches to
 *   `handle<PascalName>AttributeChanged(oldValue, newValue)`, then calls
 *   `onAttributeChanged(name, oldValue, newValue)` if present.
 * - `connectedCallback()`: registers `this` as the EventListener for each
 *   key in `component.events`, calls `onRender()` if present, then
 *   `onConnected()` if present.
 * - `disconnectedCallback()`: removes the listeners and calls `onDisconnected()`.
 *
 * `this` (the listener) implements the EventListener interface via `handleEvent`,
 * so listeners can be removed cleanly without storing bound references.
 *
 * @param {{ events?: Record<string, Function> }} component
 * @returns {{
 *   handleEvent(e: Event): void,
 *   attributeChangedCallback(name: string, oldValue: string|null, newValue: string|null): void,
 *   connectedCallback(): void,
 *   disconnectedCallback(): void,
 * }}
 */
export function buildLifecycleMethods(component) {
  const eventTypes = component.events ? Object.keys(component.events) : [];

  return {
    /**
     * @this {DecoratedInstance}
     * @param {Event} e
     */
    handleEvent(e) {
      const handler = this[`handle${strings.toPascalCase(e.type)}Event`];

      if (typeof handler === 'function') {
        handler.call(this, e);
      }
    },

    /**
     * @this {DecoratedInstance}
     * @param {string} name
     * @param {string | null} oldValue
     * @param {string | null} newValue
     */
    attributeChangedCallback(name, oldValue, newValue) {
      const handler = this[`handle${strings.toPascalCase(name)}AttributeChanged`];

      if (typeof handler === 'function') {
        handler.call(this, oldValue, newValue);
      }

      this.onAttributeChanged?.(name, oldValue, newValue);
    },

    /**
     * @this {DecoratedInstance}
     */
    connectedCallback() {
      for (const eventType of eventTypes) {
        this.addEventListener(eventType, /** @type {EventListenerObject} */ (this));
      }
      this.onRender?.();
      this.onConnected?.();
    },

    /**
     * @this {DecoratedInstance}
     */
    disconnectedCallback() {
      for (const eventType of eventTypes) {
        this.removeEventListener(eventType, /** @type {EventListenerObject} */ (this));
      }
      this.onDisconnected?.();
    },
  };
}
