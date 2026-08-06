// @ts-check

import { buildAttributeHandlers, buildEventHandlers } from "./_buildHandlers.js";
import { buildLifecycleMethods } from "./_buildLifecycleMethods.js";

/**
 * Augment the component prototype with generated handlers and lifecycle methods.
 *
 * Adds to `component.prototype`:
 * - `componentName`: the resolved custom element tag.
 * - `handle<Name>AttributeChanged` for each entry in `component.attributes`.
 * - `handle<Name>Event` for each entry in `component.events`.
 * - Standard lifecycle (`connectedCallback`, `disconnectedCallback`,
 *   `attributeChangedCallback`, `handleEvent`) from `buildLifecycleMethods`.
 *
 * Side effect: sets `component.observedAttributes` to the keys of
 * `component.attributes` when present.
 *
 * @param {CustomElementConstructor & {
 *   attributes?: Record<string, Function>,
 *   events?: Record<string, Function>,
 *   observedAttributes?: string[],
 * }} component
 * @param {string} isAttribute
 * @returns {void}
 */
export function applyMixins(component, isAttribute) {
  Object.assign(
    component.prototype,
    { componentName: isAttribute },
    component.attributes && buildAttributeHandlers(component.attributes),
    component.events && buildEventHandlers(component.events),
    buildLifecycleMethods(component),
  );

  if (component.attributes) {
    component.observedAttributes = Object.keys(component.attributes);
  }
}
