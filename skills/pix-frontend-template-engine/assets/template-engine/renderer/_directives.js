// Template Engine - Control-flow element directives (for / if / switch)

import { evaluateExpression, parseExpression } from "../expression-parser/index.js";

export const directiveMethods = {
  processForElement(forEl, data) {
    const each = forEl.getAttribute("each");
    const match = each?.match(/^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s+in\s+(.+)$/);
    if (!match) {
      forEl.remove();
      return;
    }

    const itemVar = match[1];
    const arrayExpr = match[2];

    const parsed = parseExpression(arrayExpr);
    const arr = evaluateExpression(parsed, data, Object.fromEntries(this.filters));
    if (!Array.isArray(arr)) {
      forEl.remove();
      return;
    }

    const parent = forEl.parentNode;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const clone = forEl.cloneNode(true);
      clone.removeAttribute("each");

      const newData = { ...data };
      newData[itemVar] = item;
      newData.loop = { index: i, first: i === 0, last: i === arr.length - 1, length: arr.length };

      const frag = forEl.ownerDocument.createDocumentFragment();
      while (clone.firstChild) frag.appendChild(clone.firstChild);

      this.processNode(frag, newData);
      parent.insertBefore(frag, forEl);
    }

    forEl.remove();
  },

  processIfElement(ifEl, data) {
    const cond = ifEl.getAttribute("condition") || "";
    const parsed = parseExpression(cond);
    const res = evaluateExpression(parsed, data, Object.fromEntries(this.filters));

    if (res) {
      const parent = ifEl.parentNode;
      const frag = ifEl.ownerDocument.createDocumentFragment();
      while (ifEl.firstChild) frag.appendChild(ifEl.firstChild);
      this.processNode(frag, data);
      parent.insertBefore(frag, ifEl);
      ifEl.remove();
    } else {
      ifEl.remove();
    }
  },

  processSwitchElement(switchEl, data) {
    const expr = switchEl.getAttribute("expr") || "";
    const parsed = parseExpression(expr);
    const val = evaluateExpression(parsed, data, Object.fromEntries(this.filters));

    let chosen = null;
    for (const child of Array.from(switchEl.children)) {
      if (child.tagName.toLowerCase() === "case") {
        const caseVal = child.getAttribute("value");
        if (String(caseVal) === String(val)) {
          chosen = child;
          break;
        }
      }
    }

    if (!chosen) chosen = Array.from(switchEl.children).find((c) => c.tagName.toLowerCase() === "default");

    if (chosen) {
      const parent = switchEl.parentNode;
      const frag = switchEl.ownerDocument.createDocumentFragment();
      while (chosen.firstChild) frag.appendChild(chosen.firstChild);
      this.processNode(frag, data);
      parent.insertBefore(frag, switchEl);
    }

    switchEl.remove();
  },
};
