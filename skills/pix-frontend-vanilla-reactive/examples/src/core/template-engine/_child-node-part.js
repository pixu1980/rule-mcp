// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3c - ChildNodePart
// ═══════════════════════════════════════════════════════════════════════════════

import { Part } from "./_part.js";
import { isSignalLike } from "../signals/index.js";
import { isDirective } from "./_template-helpers.js";
import { normalizeExprValue, clearRange, isRangeBeforeReference, moveRangeBefore } from "./_range.js";

// TemplateInstance is imported lazily to handle circular dependency
let TemplateInstance;

export function _setTemplateInstance(cls) {
  TemplateInstance = cls;
}

export class ChildNodePart extends Part {
  constructor(start, end) {
    super();
    this.start = start;
    this.end = end;
    this.currentNode = null;
    this.currentTemplateInstance = null;
    this.repeatState = null;
    this.repeatPayload = null;
    this.repeatItemsSignal = null;
    this.repeatItemsCleanup = null;
  }
  setValue(value) {
    if (isSignalLike(value)) {
      this.bindSignal(value, (r) => this.commit(r));
      return;
    }
    this.disposeSignal();
    this.commit(value);
  }
  commit(value) {
    if (isDirective(value, "repeat")) {
      this.commitRepeat(value.payload);
      this.value = value;
      return;
    }
    this.disposeRepeatItemsSignal();
    this.repeatPayload = null;
    this.repeatState = null;
    if (value?.kind === "template-result") {
      this.commitTemplate(value);
      this.value = value;
      return;
    }
    if (value && typeof value !== "string" && typeof value[Symbol.iterator] === "function") {
      this.currentTemplateInstance = null;
      const f = document.createDocumentFragment();
      for (const item of value) f.append(item instanceof Node ? item : document.createTextNode(String(item)));
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
    if (this.currentTemplateInstance?.strings === strings) {
      if (context) this.currentTemplateInstance.updateWithContext(result.values, context);
      return;
    }
    clearRange(this.start, this.end);
    const instance = new TemplateInstance(strings);
    this.currentTemplateInstance = instance;
    instance.updateWithContext(result.values, context || {});
    this.start.parentNode.insertBefore(instance.fragment, this.end);
  }
  bindRepeatItemsSignal(sig) {
    if (this.repeatItemsSignal === sig && this.repeatItemsCleanup) return;
    this.disposeRepeatItemsSignal();
    this.repeatItemsSignal = sig;
    this.repeatItemsCleanup = sig.subscribe(() => {
      if (!this.start.isConnected || !this.end.isConnected) {
        this.disposeRepeatItemsSignal();
        return;
      }
      if (this.repeatPayload) this.commitRepeat(this.repeatPayload);
    });
  }
  disposeRepeatItemsSignal() {
    if (this.repeatItemsCleanup) this.repeatItemsCleanup();
    this.repeatItemsCleanup = null;
    this.repeatItemsSignal = null;
  }
  commitRepeat({ items, key, renderItem }) {
    this.repeatPayload = { items, key, renderItem };
    if (isSignalLike(items)) this.bindRepeatItemsSignal(items);
    else this.disposeRepeatItemsSignal();
    const source = isSignalLike(items) ? items.get() : items;
    const list = Array.isArray(source) ? source : [...source];
    const state = this.repeatState ?? { blocks: new Map() };
    const nextBlocks = new Map();
    const seen = new Set();
    let ref = this.end;
    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i];
      const k = key(item);
      if (seen.has(k)) throw new Error("Duplicate repeat key: " + k);
      seen.add(k);
      let block = state.blocks.get(k);
      if (!block) {
        const s = document.createComment(`rs:${k}`),
          e = document.createComment(`re:${k}`);
        ref.parentNode.insertBefore(s, ref);
        ref.parentNode.insertBefore(e, ref);
        block = { key: k, start: s, end: e, part: new ChildNodePart(s, e), item };
        block.part.setValue(renderItem(item));
      } else {
        if (!isRangeBeforeReference(block.start, block.end, ref)) moveRangeBefore(block.start, block.end, ref);
        if (block.item !== item) {
          block.part.setValue(renderItem(item));
          block.item = item;
        }
      }
      nextBlocks.set(k, block);
      ref = block.start;
    }
    for (const [k, block] of state.blocks) {
      if (!nextBlocks.has(k)) {
        clearRange(block.start, block.end);
        block.start.remove();
        block.end.remove();
      }
    }
    state.blocks = nextBlocks;
    this.repeatState = state;
    this.currentTemplateInstance = null;
  }
}
