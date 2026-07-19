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

import { Signal, effect, render } from '../index.js';

/**
 * Decorator for reactive Custom Elements.
 * Call ONCE inside `static {}` block.
 *
 * @param {typeof HTMLElement} klass - The custom element class
 * @param {object} opts
 * @param {string} opts.tag - Required: Custom element tag name (e.g. 'app-root')
 * @param {string|CSSStyleSheet[]} [opts.css] - CSS loading mode:
 *   import.meta.url   → auto-resolve _App.js → _App.css (recommended)
 *   './path.css'      → fetch and adopt explicit path
 *   [sheet1, sheet2]  → adopt CSSStyleSheet array directly
 * @returns {void}
 */
export function vrComponent(klass, opts = {}) {
  const { tag, css } = opts;

  // ── Validate ────────────────────────────────────────────────
  if (!tag) throw new Error('vrComponent: tag is required');
  if (!(klass.prototype instanceof HTMLElement)) {
    throw new Error('vrComponent: class must extend HTMLElement');
  }

  // ── 1. Register Custom Element ──────────────────────────────
  if (!customElements.get(tag)) {
    customElements.define(tag, klass);
  }

  // ── 2. Load and adopt CSS ───────────────────────────────────
  if (css) {
    loadCSS(css, klass).catch(err => {
      console.warn(`vrComponent: CSS load failed for <${tag}>:`, err.message);
    });
  }

  // ── 3. Override connectedCallback ───────────────────────────
  const origConnected = klass.prototype.connectedCallback;
  klass.prototype.connectedCallback = function () {
    if (this._vrMounted) return;  // mount guard
    this._vrMounted = true;

    // Call original connectedCallback if any
    if (origConnected) origConnected.call(this);

    // Determine context source: this.context() method or empty object
    const getContext = (typeof this.context === 'function')
      ? () => this.context()
      : () => ({});

    // Determine render source: this.render() method
    const renderFn = (typeof this.render === 'function')
      ? (ctx) => this.render(ctx)
      : null;

    if (!renderFn) {
      console.warn(`vrComponent: <${tag}> has no render() method`);
      return;
    }

    // Mount reactive render effect
    this._vrDispose = effect(() => {
      const ctx = getContext();
      const result = renderFn(ctx);

      if (result && result.kind === 'template-result') {
        result._context = ctx;
        // Auto-set _scope to the component instance for @click resolution
        result._scope = this;
        render(result, this);
      }
    });
  };

  // ── 4. Override disconnectedCallback for cleanup ────────────
  const origDisconnected = klass.prototype.disconnectedCallback;
  klass.prototype.disconnectedCallback = function () {
    if (this._vrDispose) {
      this._vrDispose();
      this._vrDispose = null;
    }
    this._vrMounted = false;
    if (origDisconnected) origDisconnected.call(this);
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
async function loadCSS(css, klass) {
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
  if (typeof css !== 'string') return;

  let cssPath = css;

  // Mode 1: 'auto' (pass import.meta.url of the calling module)
  // Convention: ./_App.js → ./_App.css
  // We detect this by checking if the path ends in .js or .mjs
  if (css.endsWith('.js') || css.endsWith('.mjs')) {
    cssPath = css.replace(/\.[^.]+$/, '.css');
  }

  // Fetch CSS text
  let cssText;
  try {
    const res = await fetch(cssPath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cssText = await res.text();
  } catch (err) {
    console.warn(`vrComponent: cannot fetch CSS at "${cssPath}": ${err.message}`);
    return;
  }

  // Create and adopt stylesheet
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}
