// @ts-check

import { events } from '../events/index.js';

/**
 * Attribute change handlers for PixDetails. The decorator wires these into
 * `attributeChangedCallback` and exposes the keys as `observedAttributes`.
 *
 * Each handler receives `(oldValue, newValue)` and runs with the element as `this`.
 */
export default {
  /**
   * @this {HTMLDetailsElement & { componentName: string }}
   * @param {string | null} _oldValue
   * @param {string | null} newValue
   */
  open(_oldValue, newValue) {
    const state = newValue === null ? 'closed' : 'open';
    this.setAttribute('aria-expanded', String(state === 'open'));

    events.dispatchComponentEvent.call(this, 'toggle', { state });
  },
};
