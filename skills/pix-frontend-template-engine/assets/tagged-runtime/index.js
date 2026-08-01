// @ts-check

/**
 * Browser-safe tagged template runtime for inline component rendering.
 *
 * This helper is intentionally limited to `engine.template` and `engine.html`
 * so runtime Web Components can reuse the rule-template-engine tagged literal
 * API without pulling in the SSR/SSG renderer or Node-only dependencies.
 */
export class TemplateEngine {
  /**
   * The full file-based renderer is not available in the browser-safe runtime.
   *
   * @throws {Error}
   */
  render() {
    throw new Error(
      'TemplateEngine.render is not available in the browser-safe tagged runtime. Use the full rule-template-engine install for SSG/SSR workflows.'
    );
  }

  /**
   * Compile an inline template into a reusable render function.
   *
   * @param {TemplateStringsArray} strings
   * @param {...unknown} values
   * @returns {(data?: object) => string}
   */
  template(strings, ...values) {
    if (!Array.isArray(strings) || !Object.prototype.hasOwnProperty.call(strings, 'raw')) {
      throw new TypeError('TemplateEngine.template must be used as a tagged template literal');
    }

    return (data = {}) => this.createTemplateLiteralSource(strings, values, data);
  }

  /**
   * Alias for `template()`.
   *
   * @param {TemplateStringsArray} strings
   * @param {...unknown} values
   * @returns {(data?: object) => string}
   */
  html(strings, ...values) {
    return this.template(strings, ...values);
  }

  /**
   * Resolve JavaScript interpolations for a tagged template literal.
   *
   * @param {TemplateStringsArray} strings
   * @param {unknown[]} values
   * @param {object} data
   * @returns {string}
   */
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

export default TemplateEngine;
