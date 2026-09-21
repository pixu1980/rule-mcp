// Template Engine - Text interpolation and raw HTML fragments

import { JSDOM } from "jsdom";

import { evaluateExpression, parseExpression } from "../expression-parser/index.js";

export const textMethods = {
  processText(text, data) {
    return text.replace(/\{\{([^}]+)\}\}/g, (_m, expr) => {
      const parsed = parseExpression(expr);
      const value = evaluateExpression(parsed, data, Object.fromEntries(this.filters));
      if (value == null) return "";
      return String(value);
    });
  },

  processTextSegments(textNode, data) {
    const text = textNode.nodeType === textNode.TEXT_NODE ? textNode.textContent : String(textNode);
    const doc = textNode.ownerDocument;
    const frag = doc.createDocumentFragment();

    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before) frag.appendChild(doc.createTextNode(before));

      const expr = match[1];
      const parsed = parseExpression(expr);
      const value = evaluateExpression(parsed, data, Object.fromEntries(this.filters));

      if (value != null) {
        const appliedFilters = parsed.filters || [];
        const hasRawFilter = appliedFilters.some((f) => f.name === "raw");
        if (hasRawFilter) {
          this.appendRawContentToFragment(String(value), frag);
        } else {
          frag.appendChild(doc.createTextNode(String(value)));
        }
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) frag.appendChild(doc.createTextNode(text.slice(lastIndex)));
    return frag;
  },

  appendRawContentToFragment(value, frag) {
    try {
      const tmp = new JSDOM(value).window.document.body;
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
    } catch {
      // fallback to text if parsing fails
      frag.appendChild(frag.ownerDocument.createTextNode(String(value)));
    }
  },

  escapeHtml(str) {
    const htmlEscapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
    };
    return String(str).replace(/[&<>"']/g, (s) => htmlEscapeMap[s]);
  },
};
