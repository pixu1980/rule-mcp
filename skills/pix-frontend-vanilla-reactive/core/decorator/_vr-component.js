// ═══════════════════════════════════════════════════════════════════════════════
//  vrComponent — decorator for Custom Elements (Pattern CustomElement vrComponent & C)
//  ═══════════════════════════════════════════════════════════════════════════════
//  Called once in the static {} block of a Custom Element class.
//  Handles: define(), CSS loading (3 modes), reactive render loop with effect,
//  scope/context wiring, mount guard, and cleanup.
//
//  Usage (Pattern CustomElement vrComponent):
//    class App extends HTMLElement {
//      static { vrComponent(this, { tag: 'app-root', css: 'auto' }); }
//      handleDelete(id) { ... }
//      context() { return { title: store.state.title, ... }; }
//      render(ctx) { return html`<h1>{{ title }}</h1>`; }
//    }
//
//  Usage (Pattern CustomElement vrComponent with External HTML):
//    const TEMPLATE = html(templateStr);
//    class ProfileCard extends HTMLElement {
//      static { vrComponent(this, { tag: 'profile-card', css: 'auto' }); }
//      handleToggle(id) { ... }
//      context() { return { name: store.state.name }; }
//      render(ctx) { const r = TEMPLATE; r._context = ctx; r._scope = this; return r; }
//    }
//  ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { Signal, effect, render, loadCSS } from "../index.js";

/**
 * Decorator for reactive Custom Elements.
 * Call ONCE inside `static {}` block.
 *
 * @param {typeof HTMLElement} component - The custom element class
 * @param {object} opts
 * @param {string} opts.tag - Required: Custom element tag name (e.g. 'app-root')
 * @param {string|CSSStyleSheet[]} [opts.css] - CSS loading mode:
 *   import.meta.url   → auto-resolve _App.js → _App.css (recommended)
 *   './path.css'      → fetch and adopt explicit path
 *   [sheet1, sheet2]  → adopt CSSStyleSheet array directly
 * @returns {void}
 */
export function vrComponent(component, opts = {}) {
  const { tag, css } = opts;

  // ── Validate ────────────────────────────────────────────────
  if (!tag) {
    throw new Error("vrComponent: tag is required");
  }

  if (!(component.prototype instanceof HTMLElement)) {
    throw new Error("vrComponent: class must extend HTMLElement");
  }

  // ── 1. Register Custom Element ──────────────────────────────
  if (!customElements.get(tag)) {
    customElements.define(tag, component);
  }

  // ── 2. Load and adopt CSS ───────────────────────────────────
  if (css) {
    _loadComponentCSS(css, component).catch((err) => {
      console.warn(`vrComponent: CSS load failed for <${tag}>:`, err.message);
    });
  }

  // ── 3. Override connectedCallback ───────────────────────────
  const origConnected = component.prototype.connectedCallback;

  component.prototype.connectedCallback = function () {
    if (this._vrMounted) {
      return;
    }

    this._vrMounted = true;
    if (origConnected) {
      origConnected.call(this);
    }

    // context() is optional — defaults to {} if not defined
    const getContext =
      typeof this.context === "function"
        ? () => {
            return this.context();
          }
        : () => {
            return {};
          };

    // render() method OR opts.template (Pattern C)
    const renderFn =
      typeof this.render === "function"
        ? (ctx) => {
            return this.render(ctx);
          }
        : opts.template
          ? (ctx) => {
              const r = opts.template;

              r._context = ctx;
              r._scope = this;

              return r;
            }
          : null;

    if (!renderFn) {
      console.warn("vrComponent: <" + tag + "> needs render() method or template option");

      return;
    }

    this._vrDispose = effect(() => {
      const ctx = getContext();

      const result = renderFn(ctx);

      if (result && result.kind === "template-result") {
        if (!result._context) {
          result._context = ctx;
        }

        if (!result._scope) {
          result._scope = this;
        }

        render(result, this);
      }

    });
  };

  // ── 4. Override disconnectedCallback for cleanup ────────────
  const origDisconnected = component.prototype.disconnectedCallback;

  component.prototype.disconnectedCallback = function () {
    if (this._vrDispose) {
      this._vrDispose();
      this._vrDispose = null;
    }

    this._vrMounted = false;
    if (origDisconnected) {
      origDisconnected.call(this);
    }
  };
}

// ── CSS loading helpers ────────────────────────────────────────────────────────

/**
 * Load and adopt CSS for a component.
 * Supports 3 modes:
 *   'auto'       → resolve from module
 *   './path.css' → fetch
 *   [sheets]     → adopt directly
 */
async function _loadComponentCSS(css, component) {
  // Mode 3: CSSStyleSheet array → adopt directly
  if (Array.isArray(css)) {
    for (const sheet of css) {
      if (sheet instanceof CSSStyleSheet) {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      }
    }

    return;
  }

  // Mode 1 & 2: string path
  if (typeof css !== "string") {
    return;
  }

  let cssPath = css;

  // Mode 1: 'auto' (pass import.meta.url of the calling module)
  // Convention: ./_App.js → ./_App.css
  // We detect this by checking if the path ends in .js or .mjs
  if (css.endsWith(".js") || css.endsWith(".mjs")) {
    cssPath = css.replace(/\.[^.]+$/, ".css");
  }

  // Fetch and adopt via shared helper

  try {
    await loadCSS(cssPath);
  } catch (err) {
    console.warn(`vrComponent: cannot load CSS at "${cssPath}": ${err.message}`);
  }

}
