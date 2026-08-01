// @ts-check

import { cancelEvent } from './_cancelEvent.js';
import { dispatchCustomEvent } from './_dispatchCustomEvent.js';
import { dispatchComponentEvent } from './_dispatchComponentEvent.js';

/**
 * Event utilities used by pix custom elements.
 *
 * - `cancelEvent(e)` - preventDefault + stopPropagation + stopImmediatePropagation.
 * - `dispatchCustomEvent(namespace, name, detail, originalEvent?, dispatcher?)`.
 * - `dispatchComponentEvent(name, detail, originalEvent?)` - uses `this.componentName`.
 */
export const events = {
  cancelEvent,
  dispatchCustomEvent,
  dispatchComponentEvent,
};

export { cancelEvent, dispatchCustomEvent, dispatchComponentEvent };
