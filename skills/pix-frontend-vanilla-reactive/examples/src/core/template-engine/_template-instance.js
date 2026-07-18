// ═══════════════════════════════════════════════════════════════════════════════
//  Template Parser (getTemplate) + TemplateInstance (v2)
//  ═══════════════════════════════════════════════════════════════════════════════
//  v2: ${} removed. @click="fn(args)" added. _scope resolution added.
//  No more __attr_N__ markers, no more <!--val:N-->.
//  ═══════════════════════════════════════════════════════════════════════════════

import { parseExpression, evaluateExpression } from './_expression-parser.js';
import { ChildNodePart } from './_child-node-part.js';
import { AttributePart } from './_attribute-part.js';
import { PropertyPart } from './_property-part.js';
import { ClickHandlerPart } from './_event-part.js';
import { ExprPart } from './_expr-part.js';
import { ForPart } from './_for-part.js';
import { IfPart } from './_if-part.js';

// Resolve circular dependency: ChildNodePart needs TemplateInstance
import { _setTemplateInstance } from './_child-node-part.js';

const templateCache = new WeakMap();
const EXPR_MARKER_RE = /^expr:(\d+)$/;

function getNodePath(node, root) {
  const path = [];
  let cur = node;
  while (cur && cur !== root) {
    const p = cur.parentNode;
    if (!p) break;
    let i = 0;
    let c = cur;
    while (c.previousSibling) { c = c.previousSibling; i++; }
    path.unshift(i);
    cur = p;
  }
  return path;
}

function resolveNodePath(root, path) {
  let cur = root;
  for (const i of path) cur = cur.childNodes[i];
  return cur;
}

/**
 * Parse a template into descriptors.
 *
 * @param {string[]|string} strings - Template literal strings array, or a single string
 * @returns {{ template: HTMLTemplateElement, descriptors: Array, exprCount: number }}
 */
export function getTemplate(strings) {
  let key = strings;
  // Normalize single string to array for WeakMap key
  if (typeof strings === 'string') key = [strings];
  let rec = templateCache.get(key);
  if (rec) return rec;

  // Step 1: Assemble full HTML (no ${} markers — just join)
  const markup = Array.isArray(strings) ? strings.join('') : strings;

  // Step 2: Extract <for>, <if> directive regions
  const directives = [];
  let cleanedMarkup = markup;
  let directiveIdCounter = 0;

  cleanedMarkup = cleanedMarkup.replace(
    /<for\s+([^>]*)>([\s\S]*?)<\/for>/gi,
    (full, attrs, inner) => {
      const id = directiveIdCounter++;
      const eachMatch = attrs.match(/each\s*="([^"]*)"/);
      directives.push({
        kind: 'for', id,
        each: eachMatch ? eachMatch[1] : '',
        inner,
      });
      return `<!--dir:${id}-->`;
    }
  );
  cleanedMarkup = cleanedMarkup.replace(
    /<if\s+([^>]*)>([\s\S]*?)<\/if>/gi,
    (full, attrs, inner) => {
      const id = directiveIdCounter++;
      const condMatch = attrs.match(/condition\s*="([^"]*)"/);
      directives.push({ kind: 'if', id, condition: condMatch ? condMatch[1] : '', inner });
      return `<!--dir:${id}-->`;
    }
  );

  // Step 3: Extract @event="handler(args)" BEFORE {{ }} replacement
  // Format: @click="handlerName" or @click="handlerName($event, arg1)"
  const clickHandlers = [];
  let handlerMarkup = cleanedMarkup;
  const handlerRe = /@([a-zA-Z][\w-]*)="([^"]*)"/gi;
  let handlerMatch;
  while ((handlerMatch = handlerRe.exec(cleanedMarkup)) !== null) {
    const fullAttr = handlerMatch[0];
    const eventName = handlerMatch[1];
    const valueStr = handlerMatch[2].trim();

    // Parse handler: "handleSave" or "handleSave($event, todo.id)" or "handleSave(id)"
    const fnMatch = valueStr.match(/^([a-zA-Z_$][\w$]*)\s*(?:\(([^)]*)\))?\s*$/);
    if (fnMatch) {
      const handlerName = fnMatch[1];
      let args = [];
      if (fnMatch[2] !== undefined) {
        const argsStr = fnMatch[2].trim();
        args = argsStr ? argsStr.split(',').map(a => parseExpression(a.trim())) : [];
      }
      // else: no parens → args = [] → auto-inject $event at click time

      const idx = clickHandlers.length;
      clickHandlers.push({ eventName, handlerName, args, raw: valueStr });
      handlerMarkup = handlerMarkup.replace(fullAttr, `data-pix-event="${idx}"`);
    }
  }
  cleanedMarkup = handlerMarkup;

  // Step 4: Replace {{ expr }} with <!--expr:IDX--> markers
  let exprCounter = 0;
  const allExprMarkers = [];
  let processed = '';
  let lastIdx = 0;
  const reExpr = /\{\{([^}]+)\}\}/g;
  let mExpr;
  while ((mExpr = reExpr.exec(cleanedMarkup)) !== null) {
    processed += cleanedMarkup.slice(lastIdx, mExpr.index);
    const idx = exprCounter++;
    processed += `<!--expr:${idx}-->`;
    allExprMarkers.push({ index: idx, parsedExpr: parseExpression(mExpr[1].trim()) });
    lastIdx = reExpr.lastIndex;
  }
  processed += cleanedMarkup.slice(lastIdx);

  // Step 5: Parse into DOM template and walk
  const template = document.createElement('template');
  template.innerHTML = processed;

  const descriptors = [];
  const walker = document.createTreeWalker(
    template.content,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT
  );
  let walkNode;
  while ((walkNode = walker.nextNode())) {
    if (walkNode.nodeType === Node.COMMENT_NODE) {
      // expr marker
      const em = walkNode.data.match(EXPR_MARKER_RE);
      if (em) {
        const idx = Number(em[1]);
        const info = allExprMarkers.find(e => e.index === idx);
        descriptors.push({
          kind: 'expr', index: idx,
          parsedExpr: info?.parsedExpr || parseExpression(''),
          path: getNodePath(walkNode, template.content),
        });
        continue;
      }
      // dir marker
      const dm = walkNode.data.match(/^dir:(\d+)$/);
      if (dm) {
        const dirId = Number(dm[1]);
        const dir = directives.find(d => d.id === dirId);
        if (dir) {
          descriptors.push({
            kind: dir.kind, index: dirId,
            path: getNodePath(walkNode, template.content),
            itemVar: dir.each
              ? (dir.each.match(/^\s*([a-zA-Z_$][\w$]*)\s+in\s+/)?.[1] || 'item')
              : 'item',
            itemsExprStr: dir.each
              ? dir.each.replace(/^\s*[a-zA-Z_$][\w$]*\s+in\s+/, '').trim()
              : '',
            conditionStr: dir.condition || '',
            innerTemplate: dir.inner || '',
          });
        }
        continue;
      }
      continue;
    }

    if (walkNode.nodeType === Node.ELEMENT_NODE) {
      // Check for @click handler (stored as data-pix-event marker)
      const handlerId = walkNode.getAttribute('data-pix-event');
      if (handlerId !== null) {
        const hIdx = Number(handlerId);
        const h = clickHandlers[hIdx];
        if (h) {
          descriptors.push({
            kind: 'handler',
            index: hIdx,
            path: getNodePath(walkNode, template.content),
            eventName: h.eventName,
            handlerName: h.handlerName,
            argExprs: h.args,
          });
        }
        walkNode.removeAttribute('data-pix-event');
      }

      // Process remaining attributes
      for (const attr of [...walkNode.attributes]) {
        const attrVal = attr.value;
        const rawName = attr.name;

        // {{ }} in attribute value
        const exMatch = attrVal.match(/\{\{([^}]+)\}\}/);
        if (exMatch) {
          const idx = exprCounter++;
          const parsedExpr = parseExpression(exMatch[1].trim());
          let partType = 'attribute', name = rawName;
          if (rawName.startsWith('.')) { partType = 'property'; name = rawName.slice(1); }
          descriptors.push({
            kind: 'attrExpr', partType, index: idx,
            name, rawName, parsedExpr,
            path: getNodePath(walkNode, template.content),
          });
        }
      }
    }
  }

  rec = { template, descriptors, exprCount: exprCounter };
  templateCache.set(key, rec);
  return rec;
}

// ── TemplateInstance ──────────────────────────────────────────────────────────
export class TemplateInstance {
  constructor(strings) {
    this.strings = strings;
    const rec = getTemplate(strings);
    this.fragment = rec.template.content.cloneNode(true);
    this.exprParts = [];
    this.forParts = [];
    this.ifParts = [];
    this.clickParts = [];     // ClickHandlerPart instances
    this._scope = null;
    this._context = null;

    const resolved = rec.descriptors.map(d => ({
      descriptor: d,
      node: d.path ? resolveNodePath(this.fragment, d.path) : null,
    }));

    for (const { descriptor, node } of resolved) {
      switch (descriptor.kind) {
        case 'expr': {
          if (node) {
            const s = document.createComment(`start:expr:${descriptor.index}`);
            const e = document.createComment(`end:expr:${descriptor.index}`);
            node.replaceWith(s, e);
            this.exprParts.push({
              index: descriptor.index,
              exprPart: new ExprPart(s, e),
              parsedExpr: descriptor.parsedExpr,
            });
          }
          break;
        }
        case 'attrExpr': {
          if (node) {
            node.removeAttribute(descriptor.rawName);
            const partType = descriptor.partType || 'attribute';
            let part;
            if (partType === 'property') {
              part = new PropertyPart(node, descriptor.name);
            } else {
              part = new AttributePart(node, descriptor.name);
            }
            this.exprParts.push({
              index: descriptor.index,
              exprPart: part,
              parsedExpr: descriptor.parsedExpr,
              isAttr: true,
            });
          }
          break;
        }
        case 'handler': {
          if (node) {
            const part = new ClickHandlerPart(
              node,
              descriptor.eventName,
              descriptor.handlerName,
              descriptor.argExprs,
            );
            this.clickParts.push(part);
          }
          break;
        }
        case 'for': {
          const s = document.createComment(`for:${descriptor.index}:s`);
          const e = document.createComment(`for:${descriptor.index}:e`);
          if (node) node.replaceWith(s, e);
          const forPart = new ForPart(
            s, e,
            descriptor.itemVar,
            parseExpression(descriptor.itemsExprStr || ''),
            descriptor.innerTemplate || '',
            null,
          );
          this.forParts.push(forPart);
          break;
        }
        case 'if': {
          const s = document.createComment(`if:${descriptor.index}:s`);
          const e = document.createComment(`if:${descriptor.index}:e`);
          if (node) node.replaceWith(s, e);
          this.ifParts.push(new IfPart(
            s, e,
            parseExpression(descriptor.conditionStr || ''),
            descriptor.innerTemplate || '',
          ));
          break;
        }
      }
    }
  }

  /**
   * Update the template with new context and scope.
   *
   * @param {Array} values - ${} values (always [] in v2 — kept for compat)
   * @param {object} context - The _context object for {{ }} expressions
   * @param {object} [scope] - The _scope object for function resolution
   */
  updateWithContext(values, context, scope) {
    this._context = context;
    this._scope = scope || null;

    // 1. Update {{ }} expr parts
    for (const { exprPart, parsedExpr, isAttr } of this.exprParts) {
      if (isAttr) {
        const val = evaluateExpression(parsedExpr, context, this._scope);
        exprPart.commit(val, parsedExpr.filters &&
          parsedExpr.filters.length > 0 &&
          parsedExpr.filters[parsedExpr.filters.length - 1].name === 'raw');
      } else {
        exprPart.setValue(parsedExpr, context, this._scope);
      }
    }

    // 2. Init <for> / <if>
    for (const fp of this.forParts) fp.init(context);
    for (const ip of this.ifParts) ip.init(context);

    // 3. Update @click handlers: resolve args + bind
    for (const cp of this.clickParts) {
      cp.setContext(this._scope, context);
      cp.bind();
    }
  }

  /**
   * Update only ${} values (kept for compat — no-op in v2).
   */
  update(values) {
    // No-op: ${} removed in v2
  }
}

// Resolve circular dep: register TemplateInstance with ChildNodePart
_setTemplateInstance(TemplateInstance);
