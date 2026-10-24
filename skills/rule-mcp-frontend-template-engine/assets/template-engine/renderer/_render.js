// Template Engine - Top-level render entry and post-render cleanup

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { JSDOM } from "jsdom";

export const renderMethods = {
  render(templatePath, data = {}) {
    const fullPath = resolve(this.rootDir, templatePath);
    const currentDir = dirname(fullPath);
    const content = readFileSync(fullPath, "utf8");

    // Preprocess extends/includes at string level
    let processed = content;
    try {
      processed = this.processExtends(processed, data, currentDir);
      processed = this.processIncludes(processed, data, currentDir);
    } catch (err) {
      console.warn("Preprocessing error:", err.message);
    }

    this._currentDir = currentDir;
    return this.renderString(processed, data);
  },

  renderString(templateString, data = {}, opts = {}) {
    // Allow passing a currentDir so renderString used directly (in tests) still supports relative <include>
    if (opts.currentDir) this._currentDir = opts.currentDir;
    const dom = new JSDOM(templateString);
    const document = dom.window.document;

    const hasHtml = /<html[\s>]/i.test(templateString);
    if (hasHtml) {
      this.processNode(document.documentElement, data);
      this.cleanup(document.documentElement);

      let out = dom.serialize();
      out = out.replace(/&lt;\//g, "&lt;&#x2F;");
      return out;
    }

    this.processNode(document.body, data);
    this.cleanup(document.body);
    let out = document.body.innerHTML;
    out = out.replace(/&lt;\//g, "&lt;&#x2F;");
    return out;
  },

  cleanup(root) {
    const r = root || null;
    try {
      const container = r?.querySelectorAll ? r : null;
      if (!container) return;

      // Ensure main script is marked as module to satisfy bundlers (vite/rollup)
      const scripts = Array.from(container.querySelectorAll("script"));
      for (const s of scripts) {
        const src = s.getAttribute?.("src");
        if (src && typeof src === "string" && src.trim().endsWith("/scripts/main.js")) {
          if (!s.hasAttribute("type")) s.setAttribute("type", "module");
        }
      }

      // Normalize boolean attributes: keep them but remove empty values where possible
      for (const el of Array.from(container.querySelectorAll("[defer]"))) {
        if (el.getAttribute("defer") === "") el.setAttribute("defer", "");
      }
    } catch (_err) {
      // non-fatal - leave DOM as-is on error
    }
  },
};
