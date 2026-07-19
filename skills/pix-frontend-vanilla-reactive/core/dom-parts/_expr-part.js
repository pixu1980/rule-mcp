// ═══════════════════════════════════════════════════════════════════════════════
//  ExprPart ({{ }} interpolation with filters + composition)
// ═══════════════════════════════════════════════════════════════════════════════
//  {{ }} resolves data expressions + function calls returning TemplateResult.
//  When value.kind === 'template-result', creates a nested TemplateInstance.
//  Otherwise falls back to textContent (escaped) or raw.}
// ═══════════════════════════════════════════════════════════════════════════════

"use strict";

import { evaluateExpression } from "../template-engine/_expression-parser.js";
import { isSignalLike } from "../signals/index.js";
import { clearRange, normalizeExprValue } from "./_range.js";
// Lazy import to handle circular dependency (TemplateInstance → ExprPart → TemplateInstance)
let TemplateInstance;
export function _setTemplateInstance(cls) { TemplateInstance = cls; }

export class ExprPart {
  constructor(start, end) {
    this.start = start;
    this.end = end;
    this.currentNode = null;
    this.parsedExpr = null;
    this.signalCleanup = null;
    this._nestedInstance = null;  // TemplateInstance for {{ Fn() }}
    this._ctx = null;
    this._scope = null;
  }

  /**
   * Set the value from a {{ }} expression.
   * If value is a TemplateResult → render nested template.
   * If value is a Signal → bind signal.
   * Otherwise → committed as text (escaped or raw).
   */
  setValue(parsedExpr, ctx, scope) {
    this.parsedExpr = parsedExpr;
    this._ctx = ctx;
    this._scope = scope;
    this.disposeSignal();

    const hasRaw = parsedExpr.filters && parsedExpr.filters.length > 0
      && parsedExpr.filters[parsedExpr.filters.length - 1].name === 'raw';

    let value = evaluateExpression(parsedExpr, ctx, scope);

    if (isSignalLike(value)) { this.bindSignal(value); return; }
    this.commit(value, hasRaw);
  }

  bindSignal(sig) {
    this.disposeSignal();
    this.signalCleanup = sig.subscribe(() => {
      if (!this.start.isConnected) { this.disposeSignal(); return; }
      this.commit(sig.get(), this.hasRaw());
    });
    this.commit(sig.get(), this.hasRaw());
  }

  hasRaw() {
    return this.parsedExpr && this.parsedExpr.filters
      && this.parsedExpr.filters.length > 0
      && this.parsedExpr.filters[this.parsedExpr.filters.length - 1].name === 'raw';
  }

  disposeSignal() {
    if (this.signalCleanup) { this.signalCleanup(); this.signalCleanup = null; }
  }

  /**
   * Commit a value to the DOM.
   * TemplateResult → nested template rendering.
   * String/number → textContent (escaped) or raw.
   */
  commit(value, useRaw) {
    // Clear previous nested instance
    if (this._nestedInstance) {
      // Dispose nested instance
      clearRange(this.start, this.end);
      this._nestedInstance = null;
    }

    clearRange(this.start, this.end);

    // TemplateResult → render nested template
    if (value && typeof value === 'object' && value.kind === 'template-result') {
      const instance = new TemplateInstance(value.strings);

      instance.updateWithContext([], this._ctx || {}, this._scope);
      this._nestedInstance = instance;
      if (this.start.parentNode) {
        this.start.parentNode.insertBefore(instance.fragment, this.end);
      }

      return;
    }

    // Standard text node
    const node = normalizeExprValue(value, useRaw);

    this.currentNode = node;
    if (this.start.parentNode) {
      this.start.parentNode.insertBefore(node, this.end);
    }
  }
}

