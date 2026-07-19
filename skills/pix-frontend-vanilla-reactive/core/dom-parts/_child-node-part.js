// ═══════════════════════════════════════════════════════════════════════════════
//  ChildNodePart — renders TemplateResult (from {{ }} or html\`\`) into DOM
//  ═══════════════════════════════════════════════════════════════════════════════
//  Handles text nodes, document fragments, and nested TemplateInstances.
//  ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { Part } from "./_part.js";
import { isSignalLike } from "../signals/index.js";
import { normalizeExprValue, clearRange, isRangeBeforeReference, moveRangeBefore } from "./_range.js";

// TemplateInstance is imported lazily to handle circular dependency
let TemplateInstance;

export function _setTemplateInstance(cls) { TemplateInstance = cls; }

export class ChildNodePart extends Part {
  constructor(start, end) {
    super();
    this.start = start;
    this.end = end;
    this.currentNode = null;
    this.currentTemplateInstance = null;
  }

  setValue(value) {
    if (isSignalLike(value)) {
      this.bindSignal(value, (r) => {
      this.commit(r);
    });

      return;
    }

    this.disposeSignal();
    this.commit(value);
  }

  commit(value) {
    // TemplateResult → render nested template
    if (value?.kind === 'template-result') {
      this.commitTemplate(value);
      this.value = value;

      return;
    }

    // Iterable → append each item as node/text
    if (value && typeof value !== 'string' && typeof value[Symbol.iterator] === 'function') {
      this.currentTemplateInstance = null;
      const f = document.createDocumentFragment();

      for (const item of value) {
        f.append(item instanceof Node ? item : document.createTextNode(String(item)));
      }

      this.commitNode(f);
      this.value = value;

      return;
    }

    this.currentTemplateInstance = null;
    this.commitNode(normalizeExprValue(value));
    this.value = value;
  }

  commitNode(node) {
    clearRange(this.start, this.end);
    this.currentNode = node;
    this.start.parentNode.insertBefore(node, this.end);
  }

  commitTemplate(result) {
    const strings = result.strings;

    const context = result._context;
    const scope = result._scope;

    if (this.currentTemplateInstance?.strings === strings) {
      if (context) {
        this.currentTemplateInstance.updateWithContext(result.values, context, scope);
      }

      return;
    }

    clearRange(this.start, this.end);
    const instance = new TemplateInstance(strings);

    this.currentTemplateInstance = instance;
    instance.updateWithContext(result.values, context || {}, scope);
    this.start.parentNode.insertBefore(instance.fragment, this.end);
  }
}

