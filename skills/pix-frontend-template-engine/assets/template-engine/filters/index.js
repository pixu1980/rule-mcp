// Template Engine - Built-in Filters (barrel)
// Families live in sibling modules; this file only wires them onto a renderer.

import { registerCollectionFilters } from "./_collection.js";
import { registerDateFilters } from "./_date.js";
import { registerMarkdownFilters } from "./_markdown.js";
import { registerTextFilters } from "./_text.js";
import { registerValueFilters } from "./_value.js";

/**
 * Register all built-in filters
 * @param {import("../renderer/index.js").TemplateRenderer} renderer
 */
export function registerBuiltinFilters(renderer) {
  registerTextFilters(renderer);
  registerMarkdownFilters(renderer);
  registerDateFilters(renderer);
  registerCollectionFilters(renderer);
  registerValueFilters(renderer);
}
