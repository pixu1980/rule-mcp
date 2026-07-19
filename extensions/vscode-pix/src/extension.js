// ═══════════════════════════════════════════════════════════════════════════════
//  Pix Vanilla Reactive — Completion Provider
//  ═══════════════════════════════════════════════════════════════════════════════
//  Provides context-aware autocomplete for {{ }} expressions, @click handlers,
//  data-part attributes, and filter names based on the project's source files.
//
//  Scans JS files for:
//    - context() { return { key, ... } }  → {{ key }} suggestions
//    - _scope = { fn, ... }               → @click="fn()" suggestions
//    - export const store = new Store(...) → store.state.key
//    - registerFilter('name', ...)         → {{ expr | name }} suggestions
//  ═══════════════════════════════════════════════════════════════════════════════

const PIX_FILTERS = [
  'upper', 'lower', 'capitalize', 'slugify', 'trim',
  'escapeHtml', 'striptags', 'raw', 'json', 'default',
  'truncate', 'length', 'first', 'last', 'join',
  'tagLabel', 'tagHref', 'date', 'timeAgo', 'urlencode', 'sortBy',
];

const DATA_PARTS = [
  'root', 'header', 'footer', 'nav', 'main', 'section',
  'card', 'list', 'item', 'row', 'grid', 'cell',
  'form', 'input', 'label', 'field', 'error', 'submit',
  'btn', 'toggle', 'icon', 'avatar', 'badge', 'tag',
  'title', 'subtitle', 'text', 'meta', 'status',
  'modal', 'dialog', 'overlay', 'close', 'backdrop',
  'menu', 'dropdown', 'tab', 'panel', 'sidebar',
  'loading', 'empty', 'placeholder', 'progress',
  'toolbar', 'action', 'search', 'filter', 'sort',
];

/**
 * Scan a text for context() return keys.
 * Matches: context() { return { key1, key2: ..., ... } }
 */
function extractContextKeys(text) {
  const keys = [];
  const ctxMatch = text.match(/context\(\)\s*\{[^}]*return\s*\{([^}]+)\}/);
  if (ctxMatch) {
    const body = ctxMatch[1];
    const keyMatches = body.matchAll(/\b([a-zA-Z_$][\w$]*)\s*[:}]/g);
    for (const m of keyMatches) keys.push(m[1]);
  }
  // Also match store.state.key patterns
  const storeMatches = text.matchAll(/store\.state\.(\w+)/g);
  for (const m of storeMatches) keys.push(m[1]);
  return [...new Set(keys)];
}

/**
 * Scan text for _scope assignments and handler function names.
 */
function extractHandlers(text) {
  const handlers = [];
  const scopeMatch = text.match(/_scope\s*=\s*\{([^}]+)\}/);
  if (scopeMatch) {
    const body = scopeMatch[1];
    const fnMatches = body.matchAll(/\b([a-zA-Z_$][\w$]*)\s*[:}]/g);
    for (const m of fnMatches) handlers.push(m[1]);
  }
  // Match method names on component classes (Pattern A)
  const methodMatches = text.matchAll(/^\s+(\w+)\([^)]*\)\s*\{/gm);
  for (const m of methodMatches) {
    if (!['constructor', 'connectedCallback', 'disconnectedCallback',
          'context', 'render', 'static'].includes(m[1])) {
      handlers.push(m[1]);
    }
  }
  return [...new Set(handlers)];
}

/**
 * Scan text for registered filter names.
 */
function extractFilters(text) {
  const filters = [];
  const filterMatches = text.matchAll(/registerFilter\s*\(\s*['"](\w+)['"]\s*,/g);
  for (const m of filterMatches) filters.push(m[1]);
  return [...new Set([...filters, ...PIX_FILTERS])];
}

/**
 * Scan text for component tag names (customElements.define or vrComponent tag).
 */
function extractTags(text) {
  const tags = [];
  const defineMatches = text.matchAll(/customElements\.define\s*\(\s*['"](\S+?)['"]/g);
  for (const m of defineMatches) tags.push(m[1]);
  const vrMatches = text.matchAll(/tag:\s*['"](\S+?)['"]/g);
  for (const m of vrMatches) tags.push(m[1]);
  return [...new Set(tags)];
}

/**
 * Scan text for event names used via @event.
 */
const EVENT_NAMES = [
  'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove',
  'mouseenter', 'mouseleave', 'mouseover', 'mouseout',
  'keydown', 'keyup', 'keypress', 'focus', 'blur',
  'input', 'change', 'submit', 'reset', 'select',
  'scroll', 'wheel', 'resize', 'load', 'error',
  'touchstart', 'touchmove', 'touchend', 'touchcancel',
  'pointerdown', 'pointerup', 'pointermove',
  'dragstart', 'drag', 'dragend', 'drop',
  'copy', 'paste', 'cut', 'contextmenu',
  'animationend', 'transitionend',
];

/**
 * Activate the extension — register completion providers.
 */
function activate(context) {
  const { languages, CompletionItem, CompletionItemKind } = require('vscode');

  // ── Completion Provider for .template.html files ────────────
  const htmlProvider = languages.registerCompletionItemProvider(
    { language: 'pix-template-html', scheme: 'file' },
    {
      provideCompletionItems(document, position) {
        const items = [];
        const text = document.getText();
        const linePrefix = document.lineAt(position).text.slice(0, position.character);

        // Inside {{ }} → suggest context keys + filters
        if (linePrefix.includes('{{')) {
          const keys = extractContextKeys(text);
          for (const k of keys) {
            const item = new CompletionItem(k, CompletionItemKind.Variable);
            item.detail = 'pix context key';
            item.insertText = k;
            items.push(item);
          }
          // Add filter suggestions after | 
          if (linePrefix.includes('|')) {
            const filters = extractFilters(text);
            for (const f of filters) {
              const item = new CompletionItem(f, CompletionItemKind.Function);
              item.detail = 'pix filter';
              item.insertText = f;
              items.push(item);
            }
          }
        }

        // Inside @click="" → suggest handlers
        if (linePrefix.includes('@click=') || linePrefix.includes('@submit=')) {
          const handlers = extractHandlers(text);
          for (const h of handlers) {
            const item = new CompletionItem(h, CompletionItemKind.Function);
            item.detail = 'pix @click handler';
            item.insertText = `${h}(\$1)`;
            items.push(item);
          }
        }

        // data-part="?" → suggest roles
        const dpMatch = linePrefix.match(/data-part\s*=\s*["']([^"']*)$/);
        if (dpMatch) {
          const prefix = dpMatch[1];
          for (const role of DATA_PARTS) {
            if (!prefix || role.startsWith(prefix)) {
              const item = new CompletionItem(role, CompletionItemKind.Property);
              item.detail = 'pix data-part role';
              item.insertText = role;
              items.push(item);
            }
          }
        }

        // @event → suggest event names
        if (/@\w*$/.test(linePrefix)) {
          const atMatch = linePrefix.match(/@(\w*)$/);
          if (atMatch) {
            const prefix = atMatch[1];
            for (const ev of EVENT_NAMES) {
              if (!prefix || ev.startsWith(prefix)) {
                const item = new CompletionItem(ev, CompletionItemKind.Event);
                item.detail = 'DOM event';
                item.insertText = ev;
                items.push(item);
              }
            }
          }
        }

        return items;
      }
    },
    '{', '|', ' ', '@', '"', '\''
  );

  context.subscriptions.push(htmlProvider);

  // ── Completion Provider for JS/TS files (inside html``) ────
  const jsProvider = languages.registerCompletionItemProvider(
    [{ scheme: 'file', language: 'javascript' },
     { scheme: 'file', language: 'typescript' },
     { scheme: 'file', language: 'javascriptreact' },
     { scheme: 'file', language: 'typescriptreact' }],
    {
      provideCompletionItems(document, position) {
        const items = [];
        const text = document.getText();
        const linePrefix = document.lineAt(position).text.slice(0, position.character);

        // Check if we're inside html``
        const docText = text;
        const offset = document.offsetAt(position);
        const before = docText.slice(0, offset);
        const htmlTagMatch = before.match(/html\s*`[^`]*$/);
        if (!htmlTagMatch) return items;

        // Inside {{ }} inside html``
        if (linePrefix.includes('{{')) {
          const keys = extractContextKeys(text);
          for (const k of keys) {
            const item = new CompletionItem(k, CompletionItemKind.Variable);
            item.detail = 'pix context key';
            items.push(item);
          }
          if (linePrefix.includes('|')) {
            for (const f of extractFilters(text)) {
              const item = new CompletionItem(f, CompletionItemKind.Function);
              item.detail = 'pix filter';
              items.push(item);
            }
          }
        }

        // @click="" inside html``
        if (linePrefix.includes('@click=') || linePrefix.includes('@submit=')) {
          for (const h of extractHandlers(text)) {
            const item = new CompletionItem(h, CompletionItemKind.Function);
            item.detail = 'pix handler';
            item.insertText = `${h}(\$1)`;
            items.push(item);
          }
        }

        // data-part="" inside html``
        const dpMatch = linePrefix.match(/data-part\s*=\s*["']([^"']*)$/);
        if (dpMatch) {
          const prefix = dpMatch[1];
          for (const role of DATA_PARTS) {
            if (!prefix || role.startsWith(prefix)) {
              const item = new CompletionItem(role, CompletionItemKind.Property);
              item.detail = 'pix data-part role';
              items.push(item);
            }
          }
        }

        return items;
      }
    },
    '{', '|', ' ', '@', '"', '\''
  );

  context.subscriptions.push(jsProvider);
}

function deactivate() {}

module.exports = { activate, deactivate };
