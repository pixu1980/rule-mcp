// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3c — ForPart (<for each="item in items" [render=${Fn}]>)
// ═══════════════════════════════════════════════════════════════════════════════

import { evaluateExpression, parseExpression } from '../template-engine/_expression-parser.js';
import { isSignalLike } from '../signals/index.js';
import { isRangeBeforeReference, moveRangeBefore, clearRange } from './_range.js';
import { ChildNodePart } from './_child-node-part.js';

export class ForPart {
  constructor(start, end, itemVar, itemsParsed, innerTemplate, renderFn) {
    this.start = start; this.end = end;
    this.itemVar = itemVar;
    this.itemsParsed = itemsParsed;
    this.innerTemplate = innerTemplate;
    this.renderFn = renderFn; // (item) => html``
    this.blocks = new Map();
    this.itemsSignal = null;
    this.itemsCleanup = null;
    this.ctx = null;
  }
  init(ctx) {
    this.ctx = ctx;
    const signalOrValue = evaluateExpression(this.itemsParsed, ctx);
    if (isSignalLike(signalOrValue)) {
      this.itemsSignal = signalOrValue;
      this.itemsCleanup = signalOrValue.subscribe(() => this.reconcile());
    }
    this.reconcile();
  }
  reconcile() {
    const items = this.itemsSignal ? this.itemsSignal.get() : evaluateExpression(this.itemsParsed, this.ctx);
    const raw = items ?? [];
    const list = Array.isArray(raw) ? raw : (typeof raw[Symbol.iterator] === 'function' ? [...raw] : []);
    const nextBlocks = new Map();
    const seen = new Set();
    let ref = this.end;

    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i];
      const key = typeof item === 'object' && item !== null ? (item.id ?? JSON.stringify(item)) : String(item);
      if (seen.has(key)) continue;
      seen.add(key);

      let block = this.blocks.get(key);
      if (!block) {
        const s = document.createComment(`for:${key}:s`);
        const e = document.createComment(`for:${key}:e`);
        ref.parentNode.insertBefore(s, ref);
        ref.parentNode.insertBefore(e, ref);
        block = { key, start: s, end: e, item };
        this.renderBlock(block, item);
      } else {
        if (!isRangeBeforeReference(block.start, block.end, ref)) moveRangeBefore(block.start, block.end, ref);
        if (block.item !== item) { this.renderBlock(block, item); block.item = item; }
      }
      nextBlocks.set(key, block);
      ref = block.start;
    }

    for (const [key, block] of this.blocks) {
      if (!nextBlocks.has(key)) { clearRange(block.start, block.end); block.start.remove(); block.end.remove(); }
    }
    this.blocks = nextBlocks;
  }
  renderTemplateString(template, itemCtx) {
    // 1. Process <if condition="..."> — remove blocks, keep content
    let processed = template.replace(
      /<if\s+condition="([^"]*)">([\s\S]*?)<\/if>/gi,
      (_, condition, content) => {
        const val = evaluateExpression(parseExpression(condition), itemCtx);
        return Boolean(val) ? content : '';
      }
    );
    // 2. Evaluate {{ }} expressions
    processed = processed.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
      const val = evaluateExpression(parseExpression(expr), itemCtx);
      return val == null ? '' : String(val);
    });
    return processed;
  }
  renderBlock(block, item) {
    clearRange(block.start, block.end);
    if (this.renderFn) {
      // Component mode: call renderFn(item), render via ChildNodePart
      const childPart = new ChildNodePart(block.start, block.end);
      childPart.setValue(this.renderFn(item));
    } else {
      // String template mode — avoid spread, use __item context key
      const itemCtx = Object.assign(Object.create(this.ctx), { [this.itemVar]: item });
      const rendered = this.renderTemplateString(this.innerTemplate, itemCtx);
      const tmp = document.createElement('template');
      tmp.innerHTML = rendered;
      const children = [...tmp.content.childNodes];
      const insertPoint = block.end;
      for (let i = children.length - 1; i >= 0; i--) {
        insertPoint.parentNode.insertBefore(children[i], insertPoint);
      }
    }
  }
  destroy() {
    if (this.itemsCleanup) this.itemsCleanup();
    for (const block of this.blocks.values()) { clearRange(block.start, block.end); block.start.remove(); block.end.remove(); }
    this.blocks.clear();
  }
}
