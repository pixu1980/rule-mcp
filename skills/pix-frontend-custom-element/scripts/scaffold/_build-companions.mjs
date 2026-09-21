// @ts-check

import { SHARED_PACKAGE_NAME } from "./_shared.mjs";

/**
 * @param {{ tag: string, attributes: string[], events: string[] }} options
 * @param {boolean} hasTemplateEngine
 * @returns {Record<string, string>}
 */
export const buildCompanionJsFiles = (options, hasTemplateEngine) => {
  const { tag, attributes, events } = options;

  const attributeEntries = attributes.map((attr) => {
    const handlerName = attr.replace(/[^a-zA-Z0-9]/g, "");
    return `  /**
   * @this {HTMLElement & { componentName: string }}
   * @param {string | null} _oldValue
   * @param {string | null} _newValue
   */
  ${handlerName}(_oldValue, _newValue) {
    // handle ${attr} attribute change
  },`;
  });

  const attributesJs = `// @ts-check

import { normalizeVariant } from './${tag}.utils.js';

export default {
  /**
   * @this {HTMLElement}
   * @param {string | null} _oldValue
   * @param {string | null} newValue
   */
  variant(_oldValue, newValue) {
    this.setAttribute('data-variant', normalizeVariant(newValue));
  },
${attributeEntries.length > 0 ? attributeEntries.join("\n") + "\n" : ""}};
`;

  const eventEntries = events.map((evt) => {
    const handlerName = evt.replace(/[^a-zA-Z0-9]/g, "");
    return `  /**
   * @this {HTMLElement}
   * @param {Event} _e
   */
  ${handlerName}(_e) {
    // handle ${evt} event
  },`;
  });

  const eventsJs = `// @ts-check

export default {
${eventEntries.length > 0 ? eventEntries.join("\n") + "\n" : ""}};
`;

  const constsJs = `// @ts-check

export const DEFAULT_VARIANT = 'default';
export const SUPPORTED_VARIANTS = ['default', 'outlined'];
export const ROOT_PART = 'root';
export const CONTENT_PART = 'content';
`;

  const utilsJs = `// @ts-check

import { DEFAULT_VARIANT, SUPPORTED_VARIANTS } from './${tag}.consts.js';

/**
 * @param {string | null | undefined} value
 * @returns {'default' | 'outlined'}
 */
export const normalizeVariant = (value) => {
  return SUPPORTED_VARIANTS.includes(String(value)) ? /** @type {'default' | 'outlined'} */ (value) : DEFAULT_VARIANT;
};

/**
 * @param {ChildNode[]} nodes
 * @returns {ChildNode[]}
 */
export const filterRenderableNodes = (nodes) => {
  return nodes.filter((node) => !(node.nodeType === Node.ELEMENT_NODE && node instanceof HTMLElement && node.getAttribute('data-part') === 'root'));
};
`;

  const templateJs = hasTemplateEngine
    ? `// @ts-check

import TemplateEngine from '${SHARED_PACKAGE_NAME}/template-engine/index.js';
import { CONTENT_PART, ROOT_PART } from './${tag}.consts.js';

const engine = new TemplateEngine();

export const renderRoot = engine.html\`
  <div data-part="\${ROOT_PART}">
    <div data-part="\${CONTENT_PART}"></div>
  </div>
\`;
`
    : `// @ts-check

import { CONTENT_PART, ROOT_PART } from './${tag}.consts.js';

export const renderRoot = () => \`
  <div data-part="\${ROOT_PART}">
    <div data-part="\${CONTENT_PART}"></div>
  </div>
\`;
`;

  return {
    [`${tag}.template.js`]: templateJs,
    [`${tag}.consts.js`]: constsJs,
    [`${tag}.utils.js`]: utilsJs,
    [`${tag}.attributes.js`]: attributesJs,
    [`${tag}.events.js`]: eventsJs,
  };
};
