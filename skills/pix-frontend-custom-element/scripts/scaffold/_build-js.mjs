// @ts-check

import { buildComponentClassSource } from "./_build-class.mjs";
import { buildCompanionJsFiles } from "./_build-companions.mjs";

/**
 * @param {{ name: string, tag: string, extendsElement: string, attributes: string[], events: string[] }} options
 * @param {boolean} hasTemplateEngine
 * @returns {Record<string, string>}
 */
export const buildComponentJsFiles = (options, hasTemplateEngine) => ({
  [`${options.tag}.js`]: buildComponentClassSource(options),
  ...buildCompanionJsFiles(options, hasTemplateEngine),
});
