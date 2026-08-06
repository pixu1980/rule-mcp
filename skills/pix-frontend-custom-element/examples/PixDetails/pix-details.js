// @ts-check

// CSS is loaded as a string by the bundler. Pick the import form for your bundler:
//   Parcel:  import styles from 'bundle-text:./styles/rule-details.css';
//   Vite:    import styles from './styles/rule-details.css?raw';
//   esbuild: configure a `loader: { '.css': 'text' }` rule for the file.
// The decorator accepts either a CSS string, a CSSStyleSheet, or an array of either.
import styles from "bundle-text:./styles/rule-details.css";

import TemplateEngine from "../../../rule-template-engine/assets/tagged-runtime/index.js";

import { componentDecorator } from "../decorator/index.js";
import { strings } from "../decorator/_utils.js";

import attributes from "./rule-details.attributes.js";
import events from "./rule-details.events.js";

const engine = new TemplateEngine();

/**
 * Render function for the chevron icon. Tagged template literal compiled once
 * at module load - invocation is `renderChevron({ ... })`.
 */
const renderChevron = engine.html`<i class="rule-icon-chevron-down" aria-hidden="true"></i>`;

/**
 * Render function for the content wrapper. The original children are appended
 * after rendering - the template only sets the structural shell.
 */
const renderContent = engine.html`<section content id="${({ contentId }) => contentId}"></section>`;

/**
 * `<details is="rule-details">` - accessible disclosure built on top of the
 * native `<details>` element. Adds aria-expanded, deterministic ids on summary
 * and content section, and a chevron rendered through rule-template-engine.
 *
 * @example
 * <details is="rule-details">
 *   <summary>Read more</summary>
 *   <p>Hidden by default; toggled by the native disclosure widget.</p>
 * </details>
 */
export class PixDetails extends HTMLDetailsElement {
  static extendsElement = "details";
  static attributes = attributes;
  static events = events;
  static styles = styles;

  static {
    componentDecorator(this);
  }

  /** @type {string} */
  #guid = "";

  /** @type {HTMLElement | null} */
  #summary = null;

  /** @type {HTMLElement | null} */
  #content = null;

  constructor() {
    super();
    this.#guid = strings.guid();
  }

  /**
   * Called by the decorator-built `connectedCallback` before `onConnected`.
   * Idempotent: safe to call across reconnects.
   */
  onRender() {
    this.setAttribute("aria-expanded", String(this.open));

    this.#summary = this.querySelector(":scope > summary");

    if (!this.#summary) return;

    this.#summary.id ||= this.#guid;
    this.#summary.setAttribute("aria-controls", `${this.#guid}-content`);

    if (!this.#summary.querySelector(".rule-icon-chevron-down")) {
      this.#summary.insertAdjacentHTML("beforeend", renderChevron({}));
    }

    const existingSection = this.querySelector(":scope > section[content]");

    if (existingSection) {
      this.#content = /** @type {HTMLElement} */ (existingSection);
      this.#content.id ||= `${this.#guid}-content`;
    } else {
      const siblings = this.#nextElementSiblingsOf(this.#summary);
      const html = renderContent({ contentId: `${this.#guid}-content` });
      this.#summary.insertAdjacentHTML("afterend", html);

      const section = /** @type {HTMLElement} */ (this.#summary.nextElementSibling);

      for (const node of siblings) section.append(node);

      this.#content = section;
    }
  }

  /**
   * Programmatic API.
   */
  expand() {
    this.open = true;
  }

  collapse() {
    this.open = false;
  }

  /**
   * Collect all element siblings that follow `node` within the same parent.
   * @param {Element} node
   * @returns {Element[]}
   */
  #nextElementSiblingsOf(node) {
    const siblings = [];
    let current = node.nextElementSibling;

    while (current) {
      siblings.push(current);
      current = current.nextElementSibling;
    }

    return siblings;
  }
}

export default PixDetails;
