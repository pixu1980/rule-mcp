// @ts-check

import { applyMixins } from './_applyMixins.js';
import { defineCustomElement } from './_defineCustomElement.js';
import { generateIsAttribute } from './_generateIsAttribute.js';
import { registerStylesheet } from './_registerStylesheet.js';

/**
 * Register a component into the Custom Elements registry and wire runtime helpers.
 *
 * Responsibilities, in order:
 * 1. Adopt CSS via `document.adoptedStyleSheets` when `component.styles` is present.
 * 2. Resolve the element tag (`component.isAttribute` or kebab-case of class name).
 * 3. Define the element safely (skips if already defined; supports built-in `extends`).
 * 4. Apply mixins: prototype lifecycle, attribute/event handlers, observed attributes.
 *
 * Designed to be the only call inside a component's `static {}` block:
 *
 *   class PixDetails extends HTMLDetailsElement {
 *     static extendsElement = 'details';
 *     static attributes = attributes;
 *     static events = events;
 *     static styles = styles;
 *     static { componentDecorator(this); }
 *   }
 *
 * @param {CustomElementConstructor & {
 *   name: string,
 *   attributes?: Record<string, Function>,
 *   events?: Record<string, Function>,
 *   extendsElement?: string,
 *   isAttribute?: string,
 *   styles?: string | CSSStyleSheet | Array<string | CSSStyleSheet>,
 * }} component
 * @returns {void}
 */
export function componentDecorator(component) {
  if (component.styles) {
    registerStylesheet(component, component.styles);
  }

  const isAttribute = component.isAttribute ?? generateIsAttribute(component.name);

  defineCustomElement(component, isAttribute);
  applyMixins(component, isAttribute);
}

export { registerStylesheet };
