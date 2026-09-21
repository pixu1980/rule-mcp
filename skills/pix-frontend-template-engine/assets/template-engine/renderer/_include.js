// Template Engine - Include and markdown element directives

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

export const includeMethods = {
  processMdElement(mdEl, _data) {
    const inner = mdEl.innerHTML || "";
    const mdFilter = this.filters.get("md");
    const rendered = mdFilter ? mdFilter(inner) : inner;
    const parent = mdEl.parentNode;
    const frag = mdEl.ownerDocument.createDocumentFragment();
    const tmp = new JSDOM(rendered).window.document.body;
    while (tmp.firstChild) frag.appendChild(tmp.firstChild);
    parent.insertBefore(frag, mdEl);
    mdEl.remove();
  },

  processIncludeElement(includeEl, data) {
    const src = includeEl.getAttribute("src");
    if (!src) {
      includeEl.remove();
      return;
    }

    // Get locals or data attributes and merge with existing data
    let includeData = { ...data };

    const localsAttr = includeEl.getAttribute("locals");
    const dataAttr = includeEl.getAttribute("data");

    if (localsAttr) {
      try {
        // Process template expressions in the locals attribute first
        const processedLocals = this.processText(localsAttr, data);
        const locals = JSON.parse(processedLocals);
        includeData = { ...includeData, ...locals };
      } catch (err) {
        console.warn("Failed to parse locals attribute:", err.message, "Raw:", localsAttr);
      }
    }

    if (dataAttr) {
      try {
        // Process template expressions in the data attribute first
        const processedData = this.processText(dataAttr, data);
        const dataObj = JSON.parse(processedData);
        includeData = { ...includeData, ...dataObj };
      } catch (err) {
        console.warn("Failed to parse data attribute:", err.message);
      }
    }

    const includePath = resolve(this._currentDir || this.rootDir, src);
    try {
      const content = readFileSync(includePath, "utf8");
      const includedHtml = this.renderString(content, includeData);
      const tmp = new JSDOM(includedHtml).window.document.body;
      const frag = includeEl.ownerDocument.createDocumentFragment();
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
      includeEl.parentNode.insertBefore(frag, includeEl);
    } catch (err) {
      console.warn("Include failed:", err.message);
    }
    includeEl.remove();
  },
};
