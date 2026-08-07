// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3c - IfPart (<if condition="expr">)
// ═══════════════════════════════════════════════════════════════════════════════

import { evaluateExpression, parseExpression } from "./_expression-parser.js";
import { isSignalLike } from "../signals/index.js";
import { clearRange } from "./_range.js";
import { ForPart } from "./_for-part.js";

export class IfPart {
  constructor(start, end, conditionParsed, innerTemplate) {
    this.start = start;
    this.end = end;
    this.conditionParsed = conditionParsed;
    this.innerTemplate = innerTemplate;
    this.contentStart = null;
    this.contentEnd = null;
    this.conditionSignal = null;
    this.conditionCleanup = null;
    this.visible = false;
    this.ctx = null;
  }
  init(ctx) {
    this.ctx = ctx;
    const result = evaluateExpression(this.conditionParsed, ctx);
    if (isSignalLike(result)) {
      this.conditionSignal = result;
      this.conditionCleanup = result.subscribe(() => this.evaluate());
    }
    this.evaluate();
  }
  evaluate() {
    const val = this.conditionSignal ? this.conditionSignal.get() : evaluateExpression(this.conditionParsed, this.ctx);
    if (Boolean(val)) this.render();
    else this.clear();
  }
  render() {
    this.clear();
    this.contentStart = document.createComment("if:cs");
    this.contentEnd = document.createComment("if:ce");
    this.end.parentNode.insertBefore(this.contentStart, this.end);
    this.end.parentNode.insertBefore(this.contentEnd, this.end);
    // Process inner template string for this condition
    if (this.innerTemplate) {
      const rendered = new ForPart(/*dummy*/ null, null, "").renderTemplateString
        ? function () {
            let t = this.innerTemplate;
            t = t.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
              const val = evaluateExpression(parseExpression(expr), this.ctx);
              return val == null ? "" : String(val);
            });
            return t;
          }.call(this)
        : this.innerTemplate;

      const tmp = document.createElement("template");
      tmp.innerHTML = rendered || this.innerTemplate;
      const children = [...tmp.content.childNodes];
      const pt = this.contentEnd;
      for (let i = children.length - 1; i >= 0; i--) pt.parentNode.insertBefore(children[i], pt);
    }
    this.visible = true;
  }
  clear() {
    if (this.contentStart) {
      clearRange(this.contentStart, this.contentEnd);
      this.contentStart.remove();
      this.contentEnd.remove();
      this.contentStart = null;
      this.contentEnd = null;
    }
    this.visible = false;
  }
  destroy() {
    if (this.conditionCleanup) this.conditionCleanup();
    this.clear();
  }
}
