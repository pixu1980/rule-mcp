// @ts-check

import { buildExtendOptions } from './_buildExtendOptions.js';

/**
 * Safely register a custom element. Skips definition when:
 * - `customElements` is unavailable (non-DOM env).
 * - The element name is already defined (HMR, multiple bundle entries).
 *
 * @param {CustomElementConstructor & { extendsElement?: string }} component
 * @param {string} isAttribute - The custom element tag (e.g. "pix-details").
 * @returns {void}
 */
export function defineCustomElement(component, isAttribute) {
  if (typeof customElements === 'undefined') return;
  if (customElements.get(isAttribute)) return;
  customElements.define(isAttribute, component, buildExtendOptions(component));
}
