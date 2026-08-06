// @ts-check

import { dispatchCustomEvent } from "./_dispatchCustomEvent.js";

/**
 * Dispatch a namespaced custom event for a component instance, using
 * `this.componentName` as the namespace (set by the decorator).
 *
 * Final event type: `${componentName}.${eventName}`.
 *
 * @this {EventTarget & { componentName: string }}
 * @param {string} eventName
 * @param {object} detail
 * @param {Event} [originalEvent]
 * @returns {void}
 */
export const dispatchComponentEvent = function (eventName, detail, originalEvent = undefined) {
  const { componentName } = this;

  dispatchCustomEvent.call(
    this,
    componentName,
    eventName,
    detail,
    originalEvent ?? new Event(`${componentName}.${eventName}`),
  );
};
