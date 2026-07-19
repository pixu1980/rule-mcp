// ═══════════════════════════════════════════════════════════════════════════════
//  IfPart + SwitchPart — conditional and switch rendering
//  ═══════════════════════════════════════════════════════════════════════════════
//  IfPart supports: <if condition>, <elseif condition>, <else>
//  SwitchPart supports: <switch expr>, <case result>, <default>
//  ═══════════════════════════════════════════════════════════════════════════════

import { evaluateExpression, parseExpression } from '../template-engine/_expression-parser.js';
import { clearRange } from './_range.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Render a raw inner template string (with {{ }} expressions) against a context.
 * Used when the branch content is a string (not a compiled TemplateInstance).
 */
function renderRawTemplate(templateStr, ctx) {
  const html = templateStr.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
    const val = evaluateExpression(parseExpression(expr.trim()), ctx);
    return val == null ? '' : String(val);
  });
  const tmp = document.createElement('template');
  tmp.innerHTML = html;
  return tmp.content.childNodes;
}

/**
 * Insert child nodes before the reference node.
 */
function insertChildren(children, refNode) {
  const parent = refNode.parentNode;
  for (let i = 0; i < children.length; i++) {
    parent.insertBefore(children[i], refNode);
  }
}

// ─── IfPart ───────────────────────────────────────────────────────────────────

/**
 * Handles <if condition>, <elseif condition>, <else>.
 *
 * Usage in template:
 *   <if condition="expr1">
 *     body 1
 *   <elseif condition="expr2">
 *     body 2
 *   <else>
 *     body 3
 *   </if>
 */
export class IfPart {
  /**
   * @param {Comment} start - Start marker
   * @param {Comment} end - End marker
   * @param {Array<{condition: object|null, isElse: boolean}>} branches - Parsed conditions
   * @param {Array<string>} bodies - Raw template strings for each branch
   */
  constructor(start, end, branches, bodies) {
    this.start = start;
    this.end = end;
    this.branches = branches;   // [{ condition: parsedExpr|null, isElse: boolean }]
    this.bodies = bodies;       // [rawHtmlString, ...]
    this._contentStart = null;
    this._contentEnd = null;
    this._activeBranch = -1;
    this.ctx = null;
  }

  init(ctx) {
    this.ctx = ctx;
    this.evaluate();
  }

  evaluate() {
    let activeIdx = -1;

    for (let i = 0; i < this.branches.length; i++) {
      const branch = this.branches[i];
      if (branch.isElse) {
        // <else> is always the last match if no earlier branch matched
        activeIdx = i;
        break;
      }
      if (branch.condition) {
        const val = evaluateExpression(branch.condition, this.ctx);
        if (Boolean(val)) {
          activeIdx = i;
          break;
        }
      }
    }

    // If nothing matched, use last branch (should be <else>)
    if (activeIdx < 0 && this.branches.length > 0) {
      const last = this.branches[this.branches.length - 1];
      if (last.isElse) activeIdx = this.branches.length - 1;
    }

    if (activeIdx === this._activeBranch) return; // same branch, skip re-render
    this.clear();
    if (activeIdx >= 0 && activeIdx < this.bodies.length) {
      this.renderBranch(activeIdx);
    }
    this._activeBranch = activeIdx;
  }

  renderBranch(idx) {
    const body = this.bodies[idx];
    if (!body) return;

    this._contentStart = document.createComment('if:cs');
    this._contentEnd = document.createComment('if:ce');
    this.end.parentNode.insertBefore(this._contentStart, this.end);
    this.end.parentNode.insertBefore(this._contentEnd, this.end);

    const children = renderRawTemplate(body, this.ctx);
    insertChildren(children, this._contentEnd);
  }

  clear() {
    if (this._contentStart) {
      clearRange(this._contentStart, this._contentEnd);
      this._contentStart.remove();
      this._contentEnd.remove();
      this._contentStart = null;
      this._contentEnd = null;
    }
    this._activeBranch = -1;
  }

  destroy() {
    this.clear();
  }
}

// ─── SwitchPart ───────────────────────────────────────────────────────────────

/**
 * Handles <switch expr="expr"> with <case result="val"> and <default>.
 *
 * Usage in template:
 *   <switch expr="status">
 *     <case result="active">Active content</case>
 *     <case result="pending">Pending content</case>
 *     <default>Default content</default>
 *   </switch>
 */
export class SwitchPart {
  /**
   * @param {Comment} start - Start marker
   * @param {Comment} end - End marker
   * @param {object} exprParsed - Parsed expression for the switch value
   * @param {Array<{result: string, body: string}>} cases - Case branches
   * @param {string} defaultBody - Default branch body
   */
  constructor(start, end, exprParsed, cases, defaultBody) {
    this.start = start;
    this.end = end;
    this.exprParsed = exprParsed;
    this.cases = cases;             // [{ result: string, body: string }]
    this.defaultBody = defaultBody;
    this._contentStart = null;
    this._contentEnd = null;
    this._activeCase = -1;
    this.ctx = null;
  }

  init(ctx) {
    this.ctx = ctx;
    this.evaluate();
  }

  evaluate() {
    const switchValue = evaluateExpression(this.exprParsed, this.ctx);
    const strValue = switchValue == null ? '' : String(switchValue);

    let activeIdx = -1;

    for (let i = 0; i < this.cases.length; i++) {
      if (String(this.cases[i].result) === strValue) {
        activeIdx = i;
        break;
      }
    }

    // No case matched → use default body (stored at index = cases.length)
    const bodyIdx = activeIdx >= 0 ? activeIdx : this.cases.length;

    if (bodyIdx === this._activeCase) return;
    this.clear();
    this.renderBody(bodyIdx);
    this._activeCase = bodyIdx;
  }

  renderBody(idx) {
    let body;
    if (idx < this.cases.length) {
      body = this.cases[idx].body;
    } else {
      body = this.defaultBody;
    }
    if (!body) return;

    this._contentStart = document.createComment('switch:cs');
    this._contentEnd = document.createComment('switch:ce');
    this.end.parentNode.insertBefore(this._contentStart, this.end);
    this.end.parentNode.insertBefore(this._contentEnd, this.end);

    const children = renderRawTemplate(body, this.ctx);
    insertChildren(children, this._contentEnd);
  }

  clear() {
    if (this._contentStart) {
      clearRange(this._contentStart, this._contentEnd);
      this._contentStart.remove();
      this._contentEnd.remove();
      this._contentStart = null;
      this._contentEnd = null;
    }
    this._activeCase = -1;
  }

  destroy() {
    this.clear();
  }
}
