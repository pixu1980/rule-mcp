// @ts-check

/**
 * Dispatch a namespaced `CustomEvent`.
 * Final event type: `${eventNamespace}.${eventName}` (bubbles + cancelable).
 *
 * The original DOM event, when passed, is forwarded inside `detail.originalEvent`.
 *
 * @this {EventTarget | undefined}
 * @param {string} eventNamespace
 * @param {string} eventName
 * @param {object} [detail={}]
 * @param {Event} [originalEvent]
 * @param {EventTarget} [dispatcher]
 * @returns {void}
 */
export const dispatchCustomEvent = function (
  eventNamespace,
  eventName,
  detail = {},
  originalEvent = undefined,
  dispatcher = undefined,
) {
  const target = dispatcher ?? this ?? globalThis;

  const event = new CustomEvent(`${eventNamespace}.${eventName}`, {
    bubbles: true,
    cancelable: true,
    detail: {
      ...detail,
      ...(originalEvent && { originalEvent }),
    },
  });

  target.dispatchEvent(event);
};
