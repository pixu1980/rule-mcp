// @ts-check

/**
 * String helpers used by the decorator.
 */
export const strings = {
  /**
   * Convert any name to PascalCase.
   * Example: "click" -> "Click", "data-id" -> "DataId".
   *
   * @param {string} str
   * @returns {string}
   */
  toPascalCase(str) {
    return str
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  },

  /**
   * Convert PascalCase or camelCase to kebab-case.
   * Example: "PixDetails" -> "pix-details", "TreeView" -> "tree-view".
   *
   * @param {string} str
   * @returns {string}
   */
  toKebabCase(str) {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
  },

  /**
   * Generate a short unique id, suitable for ARIA `id` attributes.
   *
   * @returns {string}
   */
  guid() {
    return `pix-${
      globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : Math.random().toString(36).slice(2, 10)
    }`;
  },
};
