// @ts-check

import { SHARED_PACKAGE_NAME } from "./_shared.mjs";
import { extendsElementToHTMLClass } from "./_html-class.mjs";

/**
 * @param {{ name: string, tag: string, extendsElement: string }} options
 * @returns {string}
 */
export const buildComponentClassSource = (options) => {
  const { name, tag, extendsElement } = options;
  const baseClass = extendsElement ? extendsElementToHTMLClass(extendsElement) : "HTMLElement";
  const extendsLine = extendsElement ? `  static extendsElement = '${extendsElement}';\n` : "";
  const attributesImport = `import attributes from './${tag}.attributes.js';`;
  const eventsImport = `import events from './${tag}.events.js';`;

  return `// @ts-check

// CSS is loaded as a string by the bundler. Configure the bundler to treat
// component CSS imports as raw text (for esbuild: \`loader: { '.css': 'text' }\`).
import styles from './styles/${tag}.css';

import { componentDecorator } from '${SHARED_PACKAGE_NAME}/decorator/index.js';

${attributesImport}
${eventsImport}
import { renderRoot } from './${tag}.template.js';
import { CONTENT_PART } from './${tag}.consts.js';
import { filterRenderableNodes, normalizeVariant } from './${tag}.utils.js';

export class ${name} extends ${baseClass} {
${extendsLine}  static attributes = attributes;
  static events = events;
  static styles = styles;

  static {
    componentDecorator(this);
  }

  constructor() {
    super();
  }

  /**
   * @returns {'default' | 'outlined'}
   */
  get variant() {
    return normalizeVariant(this.getAttribute('variant'));
  }

  /**
   * @param {string | null | undefined} value
   */
  set variant(value) {
    this.setAttribute('variant', normalizeVariant(value));
  }

  onRender() {
    const existingRoot = this.querySelector(':scope > [data-part="root"]');

    if (!existingRoot) {
      const nodes = filterRenderableNodes(Array.from(this.childNodes));
      this.innerHTML = renderRoot({});
      this.querySelector(':scope > [data-part="content"]')?.append(...nodes);
    }

    this.#syncState();
  }

  /**
   * @param {string} name
   * @param {string | null} _oldValue
   * @param {string | null} newValue
   */
  onAttributeChanged(name, _oldValue, newValue) {
    if (name === 'variant') {
      this.setAttribute('data-variant', normalizeVariant(newValue));
    }
  }

  #syncState() {
    const variant = this.variant;
    this.setAttribute('variant', variant);
    this.setAttribute('data-variant', variant);
    this.querySelector(':scope > [data-part="' + CONTENT_PART + '"]')?.setAttribute('data-variant', variant);
  }
}

export { normalizeVariant } from './${tag}.utils.js';
export default ${name};
`;
};
