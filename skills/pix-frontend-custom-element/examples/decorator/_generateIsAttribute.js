// @ts-check

import { strings } from './_utils.js';

/**
 * Convert a component class name (PascalCase) into its custom-element tag
 * (kebab-case). The result must contain at least one hyphen - it is the
 * caller's responsibility to use a class name with two or more PascalCase
 * words (e.g., `PixDetails` -> `pix-details`).
 *
 * @param {string} name - Class name, e.g. "PixDetails"
 * @returns {string} - Custom element name, e.g. "pix-details"
 */
export function generateIsAttribute(name) {
  return strings.toKebabCase(name);
}
