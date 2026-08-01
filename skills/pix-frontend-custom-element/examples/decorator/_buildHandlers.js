// @ts-check

import { strings } from './_utils.js';

/**
 * Convert a `{ name: fn }` map into `{ handle<PascalName><Suffix>: fn }`.
 *
 * @template T
 * @param {Record<string, T>} input
 * @param {string} [methodSuffix='']
 * @returns {Record<string, T>}
 */
export function buildHandlers(input, methodSuffix = '') {
  return Object.entries(input).reduce((acc, [key, fn]) => {
    acc[`handle${strings.toPascalCase(key)}${methodSuffix}`] = fn;
    return acc;
  }, /** @type {Record<string, T>} */ ({}));
}

/**
 * `{ click: fn }` -> `{ handleClickEvent: fn }`
 *
 * @template T
 * @param {Record<string, T>} events
 * @returns {Record<string, T>}
 */
export function buildEventHandlers(events) {
  return buildHandlers(events, 'Event');
}

/**
 * `{ open: fn }` -> `{ handleOpenAttributeChanged: fn }`
 *
 * @template T
 * @param {Record<string, T>} attributes
 * @returns {Record<string, T>}
 */
export function buildAttributeHandlers(attributes) {
  return buildHandlers(attributes, 'AttributeChanged');
}
