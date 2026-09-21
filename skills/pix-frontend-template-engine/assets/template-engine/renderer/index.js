// Template Engine - DOM Renderer (barrel)
// Phases live in sibling modules; methods are assigned onto the class prototype.

import { registerBuiltinFilters } from "../filters/index.js";
import { directiveMethods } from "./_directives.js";
import { includeMethods } from "./_include.js";
import { preprocessMethods } from "./_preprocess.js";
import { renderMethods } from "./_render.js";
import { textMethods } from "./_text.js";
import { walkMethods } from "./_walk.js";

export class TemplateRenderer {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.filters = new Map();
    this.cache = new Map();

    // Register builtin filters immediately so both preprocessing and DOM rendering can use them
    registerBuiltinFilters(this);
  }

  registerFilter(name, fn) {
    this.filters.set(name, fn);
  }
}

Object.assign(
  TemplateRenderer.prototype,
  preprocessMethods,
  renderMethods,
  walkMethods,
  textMethods,
  directiveMethods,
  includeMethods,
);
