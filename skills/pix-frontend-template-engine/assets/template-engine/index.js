// Template Engine - Main Entry Point

import { registerBuiltinFilters } from './_filters.js';
import { TemplateRenderer } from './_renderer.js';

export class TemplateEngine {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();

    // Use DOM based renderer by default to handle nested structures reliably
    this.renderer = new TemplateRenderer(this.rootDir);

    // Register built-in filters
    registerBuiltinFilters(this.renderer);
  }

  /**
   * Render a template with given data
   * @param {string} templatePath - Path to template file
   * @param {object} data - Template data
   * @param {object} options - Render options
   * @returns {string} Rendered HTML
   */
  render(templatePath, data = {}, options = {}) {
    return this.renderer.render(templatePath, data, options);
  }

  /**
   * Compile an inline template into a reusable render function.
   * Use as a tagged template literal:
   * const renderCard = engine.template`<article>{{ title }}</article>`;
   * renderCard({ title: 'Hello' });
   *
   * Interpolated JavaScript values are inserted before engine rendering.
   * If an interpolated value is a function, it receives the render data.
   * @param {TemplateStringsArray} strings - Tagged template strings
   * @param {...unknown} values - Tagged template interpolations
   * @returns {(data?: object, options?: object) => string} Render function
   */
  template(strings, ...values) {
    if (!Array.isArray(strings) || !Object.prototype.hasOwnProperty.call(strings, 'raw')) {
      throw new TypeError('TemplateEngine.template must be used as a tagged template literal');
    }

    return (data = {}, options = {}) => {
      const templateString = this.createTemplateLiteralSource(strings, values, data);
      return this.renderer.renderString(templateString, data, options);
    };
  }

  /**
   * Alias for template tagged literal usage.
   * @param {TemplateStringsArray} strings - Tagged template strings
   * @param {...unknown} values - Tagged template interpolations
   * @returns {(data?: object, options?: object) => string} Render function
   */
  html(strings, ...values) {
    return this.template(strings, ...values);
  }

  /**
   * Register a custom filter
   * @param {string} name - Filter name
   * @param {function} fn - Filter function
   */
  registerFilter(name, fn) {
    this.renderer.registerFilter(name, fn);
  }

  createTemplateLiteralSource(strings, values, data) {
    let source = '';

    for (let index = 0; index < strings.length; index++) {
      source += strings[index];

      if (index < values.length) {
        const value = values[index];
        const resolvedValue = typeof value === 'function' ? value(data) : value;
        source += resolvedValue == null ? '' : String(resolvedValue);
      }
    }

    return source;
  }
}

// Default export for convenience
export default TemplateEngine;

// Also export renderer classes for direct use in tests/tools
export { TemplateRenderer };
