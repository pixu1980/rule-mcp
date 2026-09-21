// @ts-check

import { buildComponentCssFiles } from "./_build-css.mjs";
import { buildComponentJsFiles } from "./_build-js.mjs";

/**
 * @param {{ name: string, tag: string, extendsElement: string, attributes: string[], events: string[] }} options
 * @param {string} _sharedImportPath
 * @param {boolean} [hasTemplateEngine=true]
 * @returns {Record<string, string>}
 */
export const buildComponentFiles = (options, _sharedImportPath, hasTemplateEngine = true) => ({
  ...buildComponentJsFiles(options, hasTemplateEngine),
  ...buildComponentCssFiles(options),
});
