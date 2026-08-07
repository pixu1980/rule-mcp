// ═══════════════════════════════════════════════════════════════════════════════
//  pix Vanilla Reactive - Completion Provider
//  ═══════════════════════════════════════════════════════════════════════════════
//  Provides context-aware autocomplete for {{ }}, @click, data-part, filters.
//  Scans ALL workspace files, not just the current document.
//  Caches results until workspace changes.
//  ═══════════════════════════════════════════════════════════════════════════════

const vscode = require("vscode");

const BUILTIN_FILTERS = [
  "upper",
  "lower",
  "capitalize",
  "slugify",
  "trim",
  "escapeHtml",
  "striptags",
  "raw",
  "json",
  "default",
  "truncate",
  "length",
  "first",
  "last",
  "join",
  "tagLabel",
  "tagHref",
  "date",
  "timeAgo",
  "urlencode",
  "sortBy",
];

const DATA_PARTS = [
  "root",
  "header",
  "footer",
  "nav",
  "main",
  "section",
  "card",
  "list",
  "item",
  "row",
  "grid",
  "cell",
  "form",
  "input",
  "label",
  "field",
  "error",
  "submit",
  "btn",
  "toggle",
  "icon",
  "avatar",
  "badge",
  "tag",
  "title",
  "subtitle",
  "text",
  "meta",
  "status",
  "modal",
  "dialog",
  "overlay",
  "close",
  "backdrop",
  "menu",
  "dropdown",
  "tab",
  "panel",
  "sidebar",
  "loading",
  "empty",
  "placeholder",
  "progress",
  "toolbar",
  "action",
  "search",
  "filter",
  "sort",
];

const EVENT_NAMES = [
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "mousemove",
  "mouseenter",
  "mouseleave",
  "mouseover",
  "mouseout",
  "keydown",
  "keyup",
  "keypress",
  "focus",
  "blur",
  "input",
  "change",
  "submit",
  "reset",
  "select",
  "scroll",
  "wheel",
  "resize",
  "load",
  "error",
  "touchstart",
  "touchmove",
  "touchend",
  "touchcancel",
  "pointerdown",
  "pointerup",
  "pointermove",
  "dragstart",
  "drag",
  "dragend",
  "drop",
  "copy",
  "paste",
  "cut",
  "contextmenu",
  "animationend",
  "transitionend",
];

// ─── Workspace cache ─────────────────────────────────────────────────────────
let cachedContextKeys = [];
let cachedHandlers = [];
let cachedFilters = [];
let cachedTags = [];

function clearCache() {
  cachedContextKeys = [];
  cachedHandlers = [];
  cachedFilters = [];
  cachedTags = [];
}

/**
 * Find all JS files in the open workspace and scan them for pix patterns.
 * Caches results. Call clearCache() to force re-scan.
 */
async function scanWorkspace() {
  if (cachedContextKeys.length > 0) return; // already cached

  const keys = new Set();
  const handlers = new Set();
  const filters = new Set([...BUILTIN_FILTERS]);
  const tags = new Set();

  const jsFiles = await vscode.workspace.findFiles("**/*.{js,mjs,jsx,ts,tsx}", "**/node_modules/**");

  for (const file of jsFiles) {
    try {
      const text = (await vscode.workspace.fs.readFile(file)).toString();

      // context() { return { key1, key2, ... } }
      const contextMatch = text.match(/context\s*\(\s*\)\s*\{[^}]*return\s*\{([^}]+)\}/);
      if (contextMatch) {
        const body = contextMatch[1];
        const keyMatches = body.matchAll(/\b([a-zA-Z_$][\w$]*)\s*[:}]/g);
        for (const m of keyMatches) keys.add(m[1]);
      }

      // store.state.something or store.state.something.sub
      const storeMatches = text.matchAll(/store\.state\.(\w+)/g);
      for (const m of storeMatches) keys.add(m[1]);

      // _scope = { fn1, fn2, ... }
      const scopeMatch = text.match(/_scope\s*=\s*\{([^}]+)\}/);
      if (scopeMatch) {
        const body = scopeMatch[1];
        const fnMatches = body.matchAll(/\b([a-zA-Z_$][\w$]*)\s*[:}]/g);
        for (const m of fnMatches) handlers.add(m[1]);
      }

      // @click handlers from method names (Pattern A)
      const methodMatches = text.matchAll(/^\s+(\w+)\s*\([^)]*\)\s*\{/gm);
      for (const m of methodMatches) {
        if (
          !["constructor", "connectedCallback", "disconnectedCallback", "context", "render", "static"].includes(m[1])
        ) {
          handlers.add(m[1]);
        }
      }

      // registerFilter('name', ...)
      const filterMatches = text.matchAll(/registerFilter\s*\(\s*['"](\w+)['"]\s*,/g);
      for (const m of filterMatches) filters.add(m[1]);

      // customElements.define('tag-name', ...)
      const defineMatches = text.matchAll(/customElements\.define\s*\(\s*['"](\S+?)['"]/g);
      for (const m of defineMatches) tags.add(m[1]);

      // vrComponent tag: 'tag-name'
      const tagMatches = text.matchAll(/tag:\s*['"](\S+?)['"]/g);
      for (const m of tagMatches) tags.add(m[1]);
    } catch {
      /* skip unreadable files */
    }
  }

  cachedContextKeys = [...keys].sort();
  cachedHandlers = [...handlers].sort();
  cachedFilters = [...filters].sort();
  cachedTags = [...tags].sort();
}

function activate(context) {
  // Re-scan when workspace files change
  const watcher = vscode.workspace.createFileSystemWatcher("**/*.{js,mjs,jsx,ts,tsx}");
  watcher.onDidChange(clearCache);
  watcher.onDidCreate(clearCache);
  watcher.onDidDelete(clearCache);
  context.subscriptions.push(watcher);

  // ── Provider for .template.html ──────────────────────────────
  const htmlProvider = vscode.languages.registerCompletionItemProvider(
    { language: "pix-template-html", scheme: "file" },
    {
      async provideCompletionItems(document, position) {
        await scanWorkspace();
        const items = [];
        const linePrefix = document.lineAt(position).text.slice(0, position.character);

        // Inside {{ }} → context keys
        if (linePrefix.includes("{{") && !linePrefix.includes("|")) {
          for (const k of cachedContextKeys) {
            const item = new vscode.CompletionItem(k, vscode.CompletionItemKind.Variable);
            item.detail = "pix context";
            item.range = document.getWordRangeAtPosition(position, /\w*$/);
            items.push(item);
          }
        }

        // After | inside {{ }} → filters
        if (linePrefix.includes("|")) {
          const pipeIdx = linePrefix.lastIndexOf("|");
          const afterPipe = linePrefix.slice(pipeIdx + 1).trim();
          for (const f of cachedFilters) {
            if (!afterPipe || f.startsWith(afterPipe)) {
              const item = new vscode.CompletionItem(f, vscode.CompletionItemKind.Function);
              item.detail = "pix filter";
              items.push(item);
            }
          }
        }

        // Inside @click="…" or @submit="…" → handlers
        if (/@\w+="[^"]*$/.test(linePrefix)) {
          const quoteMatch = linePrefix.match(/@\w+="([^"]*)$/);
          const prefix = quoteMatch ? quoteMatch[1] : "";
          for (const h of cachedHandlers) {
            if (!prefix || h.startsWith(prefix)) {
              const item = new vscode.CompletionItem(h, vscode.CompletionItemKind.Function);
              item.detail = "pix handler";
              item.insertText = `${h}($1)`;
              items.push(item);
            }
          }
        }

        // data-part="…" → roles
        const dpMatch = linePrefix.match(/data-part\s*=\s*["']([^"']*)$/);
        if (dpMatch) {
          const prefix = dpMatch[1];
          for (const role of DATA_PARTS) {
            if (!prefix || role.startsWith(prefix)) {
              const item = new vscode.CompletionItem(role, vscode.CompletionItemKind.Property);
              item.detail = "pix data-part";
              items.push(item);
            }
          }
        }

        // @ev → event names
        const atEvent = linePrefix.match(/@(\w*)$/);
        if (atEvent) {
          const prefix = atEvent[1];
          for (const ev of EVENT_NAMES) {
            if (!prefix || ev.startsWith(prefix)) {
              const item = new vscode.CompletionItem(ev, vscode.CompletionItemKind.Event);
              item.detail = "DOM event";
              items.push(item);
            }
          }
        }

        return items;
      },
    },
    "{",
    "|",
    " ",
    "@",
    '"',
    "'",
    ".",
  );
  context.subscriptions.push(htmlProvider);

  // ── Provider for JS/TS (inside html``) ────────────────────────
  const jsProvider = vscode.languages.registerCompletionItemProvider(
    [
      { language: "javascript", scheme: "file" },
      { language: "typescript", scheme: "file" },
      { language: "javascriptreact", scheme: "file" },
      { language: "typescriptreact", scheme: "file" },
    ],
    {
      async provideCompletionItems(document, position) {
        const offset = document.offsetAt(position);
        const before = document.getText().slice(0, offset);
        // Only activate inside html``
        const htmlTag = before.match(/html\s*`[^`]*$/);
        if (!htmlTag) return [];

        await scanWorkspace();
        const items = [];
        const linePrefix = document.lineAt(position).text.slice(0, position.character);

        // {{ }} → context keys
        if (linePrefix.includes("{{") && !linePrefix.includes("|")) {
          for (const k of cachedContextKeys) {
            const item = new vscode.CompletionItem(k, vscode.CompletionItemKind.Variable);
            item.detail = "pix context";
            items.push(item);
          }
        }

        // | → filters
        if (linePrefix.includes("|")) {
          const pipeIdx = linePrefix.lastIndexOf("|");
          const afterPipe = linePrefix.slice(pipeIdx + 1).trim();
          for (const f of cachedFilters) {
            if (!afterPipe || f.startsWith(afterPipe)) {
              const item = new vscode.CompletionItem(f, vscode.CompletionItemKind.Function);
              item.detail = "pix filter";
              items.push(item);
            }
          }
        }

        // @click="…" → handlers
        if (/@\w+="[^"]*$/.test(linePrefix)) {
          const quoteMatch = linePrefix.match(/@\w+="([^"]*)$/);
          const prefix = quoteMatch ? quoteMatch[1] : "";
          for (const h of cachedHandlers) {
            if (!prefix || h.startsWith(prefix)) {
              const item = new vscode.CompletionItem(h, vscode.CompletionItemKind.Function);
              item.detail = "pix handler";
              item.insertText = `${h}($1)`;
              items.push(item);
            }
          }
        }

        // data-part="…" → roles
        const dpMatch = linePrefix.match(/data-part\s*=\s*["']([^"']*)$/);
        if (dpMatch) {
          const prefix = dpMatch[1];
          for (const role of DATA_PARTS) {
            if (!prefix || role.startsWith(prefix)) {
              const item = new vscode.CompletionItem(role, vscode.CompletionItemKind.Property);
              item.detail = "pix data-part";
              items.push(item);
            }
          }
        }

        return items;
      },
    },
    "{",
    "|",
    " ",
    "@",
    '"',
    "'",
    ".",
  );
  context.subscriptions.push(jsProvider);
}

function deactivate() {}

module.exports = { activate, deactivate };
