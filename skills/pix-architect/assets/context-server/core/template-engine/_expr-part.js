// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3c — ExprPart ({{ }} interpolation with filters)
// ═══════════════════════════════════════════════════════════════════════════════

import { evaluateExpression } from "./_expression-parser.js";
import { isSignalLike } from "../signals/index.js";
import { clearRange, normalizeExprValue } from "./_range.js";

export class ExprPart {
  constructor(start, end) {
    this.start = start;
    this.end = end;
    this.currentNode = null;
    this.parsedExpr = null;
    this.signalCleanup = null;
  }
  setValue(parsedExpr, ctx) {
    this.parsedExpr = parsedExpr;
    this.disposeSignal();
    const hasRaw = parsedExpr.filters.length > 0 && parsedExpr.filters[parsedExpr.filters.length - 1].name === "raw";
    let value = evaluateExpression(parsedExpr, ctx);
    if (isSignalLike(value)) {
      this.bindSignal(value);
      return;
    }
    this.commit(value, hasRaw);
  }
  bindSignal(sig) {
    this.disposeSignal();
    this.signalCleanup = sig.subscribe(() => {
      if (!this.start.isConnected) {
        this.disposeSignal();
        return;
      }
      this.commit(sig.get(), this.hasRaw());
    });
    this.commit(sig.get(), this.hasRaw());
  }
  hasRaw() {
    return (
      this.parsedExpr &&
      this.parsedExpr.filters.length > 0 &&
      this.parsedExpr.filters[this.parsedExpr.filters.length - 1].name === "raw"
    );
  }
  disposeSignal() {
    if (this.signalCleanup) {
      this.signalCleanup();
      this.signalCleanup = null;
    }
  }
  commit(value, useRaw) {
    clearRange(this.start, this.end);
    const node = normalizeExprValue(value, useRaw);
    this.currentNode = node;
    if (this.start.parentNode) this.start.parentNode.insertBefore(node, this.end);
  }
}
