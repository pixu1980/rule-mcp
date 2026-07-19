// ═══════════════════════════════════════════════════════════════════════════════
//  Template Parser (getTemplate) + TemplateInstance 
//  ═══════════════════════════════════════════════════════════════════════════════
//  Syntax: {{ }}, <for>, <if>, <switch>, @event="handler(args)", .prop="{{ }}".
//  Handler resolution via _scope → _context → component instance.
//  ═══════════════════════════════════════════════════════════════════════════════

'use strict';
import { parseExpression, evaluateExpression } from './_expression-parser.js';
import { ChildNodePart } from '../dom-parts/_child-node-part.js';
import { AttributePart } from '../dom-parts/_attribute-part.js';
import { PropertyPart } from '../dom-parts/_property-part.js';
import { EventPart } from '../dom-parts/_event-part.js';
import { ExprPart } from '../dom-parts/_expr-part.js';
import { ForPart } from '../dom-parts/_for-part.js';
import { IfPart, SwitchPart } from '../dom-parts/_if-part.js';

// Resolve circular dependency: ChildNodePart + ExprPart need TemplateInstance
import { _setTemplateInstance } from '../dom-parts/_child-node-part.js';
import { _setTemplateInstance as _setExprTemplateInstance } from '../dom-parts/_expr-part.js';

const templateCache = new WeakMap();
const EXPR_MARKER_RE = /^expr:(\d+)$/;

function getNodePath(node, root) {
  const path = [];
  let cur = node;
  while (cur && cur !== root) {
    const p = cur.parentNode;
    if (!p) {
      break;
    }
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
  if (typeof strings === 'string') {
    key = [strings];
  }
  let rec = templateCache.get(key);
  if (rec) {
    return rec;
  }

  // Step 1: Assemble full HTML
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
  // Extract <if> blocks with optional <elseif> and <else> branches
  cleanedMarkup = cleanedMarkup.replace(
    /<if\s+([^>]*)>([\s\S]*?)<\/if>/gi,
    (full, attrs, inner) => {
      const id = directiveIdCounter++;
      const condMatch = attrs.match(/condition\s*="([^"]*)"/);
      const condition = condMatch ? condMatch[1] : '';

      // Parse inner into branches: <elseif ...>, <else>, rest
      const branches = [{ condition }];  // first branch = the <if> itself
      const bodies = [];

      // Split on <elseif condition="..."> and <else>
      const branchRe = /<elseif\s+([^>]*)>|<else>|<\/if>/gi;
      let lastIdx = 0;
      let branchMatch;
      let branchIdx = 0;

      // Collect re-joined matches with their positions
      while ((branchMatch = branchRe.exec(full)) !== null) {
        const segment = inner.slice(lastIdx, branchMatch.index - full.indexOf('>') - 1);
        bodies.push(segment);
        lastIdx = branchMatch.index - full.indexOf('>') - 1 + branchMatch[0].length;

        if (branchMatch[0] === '<else>') {
          branches.push({ condition: null, isElse: true });
          branchIdx++;
        } else if (branchMatch[0].startsWith('<elseif')) {
          const elseCondMatch = branchMatch[1].match(/condition\s*="([^"]*)"/);
          branches.push({ condition: elseCondMatch ? elseCondMatch[1] : '', isElse: false });
          branchIdx++;
        }
      }
      // Last body (after last branch marker, before </if>)
      const remaining = inner.slice(lastIdx);

      if (remaining.trim()) {
        bodies.push(remaining);
      } else if (branches.length > bodies.length) {
        bodies.push('');
      }

      directives.push({
        kind: 'if', id,
        branches,
        bodies,
      });
      return `<!--dir:${id}-->`;
    }
  );

  // Extract <switch expr="..."> blocks with <case> and <default>
  cleanedMarkup = cleanedMarkup.replace(
    /<switch\s+([^>]*)>([\s\S]*?)<\/switch>/gi,
    (full, attrs, inner) => {
      const id = directiveIdCounter++;
      const exprMatch = attrs.match(/expr\s*="([^"]*)"/);
      const switchExpr = exprMatch ? exprMatch[1] : '';

      // Parse inner into cases
      const cases = [];
      let defaultBody = null;
      let lastIdx = 0;
      const caseRe = /<(case)\s+([^>]*)>|<(default)>/gi;
      let caseMatch;

      while ((caseMatch = caseRe.exec(inner)) !== null) {
        if (caseMatch[1] === 'case') {
          const resultMatch = caseMatch[2].match(/result\s*="([^"]*)"/);
          cases.push({
            result: resultMatch ? resultMatch[1] : '',
            body: inner.slice(lastIdx, caseMatch.index),
          });
          lastIdx = caseMatch.index + caseMatch[0].length;
        } else if (caseMatch[3] === 'default') {
          defaultBody = inner.slice(lastIdx, caseMatch.index);
          lastIdx = caseMatch.index + caseMatch[0].length;
        }
      }

      directives.push({
        kind: 'switch', id,
        expr: switchExpr,
        cases,
        defaultBody,
      });
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
      handlerMarkup = handlerMarkup.replace(fullAttr, `data-rule-event="${idx}"`);
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
          const base = {
            kind: dir.kind,
            index: dirId,
            path: getNodePath(walkNode, template.content),
          };
          if (dir.kind === 'for') {
            base.itemVar = dir.each
              ? (dir.each.match(/^\s*([a-zA-Z_$][\w$]*)\s+in\s+/)?.[1] || 'item')
              : 'item';
            base.itemsExprStr = dir.each
              ? dir.each.replace(/^\s*[a-zA-Z_$][\w$]*\s+in\s+/, '').trim()
              : '';
            base.innerTemplate = dir.inner || '';
          } else if (dir.kind === 'if') {
            base.branches = dir.branches || [];
            base.bodies = dir.bodies || [];
          } else if (dir.kind === 'switch') {
            base.expr = dir.expr || '';
            base.cases = dir.cases || [];
            base.defaultBody = dir.defaultBody || null;
          }
          descriptors.push(base);
        }
        continue;
      }
      continue;
    }

    if (walkNode.nodeType === Node.ELEMENT_NODE) {
      // Check for @click handler (stored as data-rule-event marker)
      const handlerId = walkNode.getAttribute('data-rule-event');
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
        walkNode.removeAttribute('data-rule-event');
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
    this.switchParts = [];
    this.eventParts = [];     // EventPart instances
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
            const part = new EventPart(
              node,
              descriptor.eventName,
              descriptor.handlerName,
              descriptor.argExprs,
            );
            this.eventParts.push(part);
          }
          break;
        }
        case 'for': {
          const s = document.createComment(`for:${descriptor.index}:s`);
          const e = document.createComment(`for:${descriptor.index}:e`);
          if (node) {
            node.replaceWith(s, e);
          }
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
          if (node) {
            node.replaceWith(s, e);
          }
          // Parse branches: [{ condition: 'expr' | null(isElse) }, ...]
          const branches = (descriptor.branches || []).map(b => ({
            condition: b.condition ? parseExpression(b.condition) : null,
            isElse: !!b.isElse,
          }));
          this.ifParts.push(new IfPart(
            s, e,
            branches,
            descriptor.bodies || [],
          ));
          break;
        }
        case 'switch': {
          const s = document.createComment(`switch:${descriptor.index}:s`);
          const e = document.createComment(`switch:${descriptor.index}:e`);
          if (node) {
            node.replaceWith(s, e);
          }
          this.switchParts.push(new SwitchPart(
            s, e,
            parseExpression(descriptor.expr || ''),
            (descriptor.cases || []).map(c => ({
              result: c.result,
              body: c.body || '',
            })),
            descriptor.defaultBody || '',
          ));
          break;
        }
      }
    }
  }

  /**
   * Update the template with new context and scope.
   *
   * @param {Array} values - ${} values (always [] — kept for compat)
   * @param {object} context - The _context object for {{ }} expressions
   * @param {object} [scope] - The _scope object for @click handler resolution
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

    // 2. Init <for> / <if> / <switch>
    for (const fp of this.forParts) fp.init(context);
    for (const ip of this.ifParts) ip.init(context);
    for (const sp of this.switchParts) sp.init(context);

    // 3. Update @click handlers: resolve args + bind
    for (const ep of this.eventParts) {
      ep.setContext(this._scope, context);
      ep.bind();
    }
  }

  update(values) {}
}

// Resolve circular dep: register TemplateInstance with ChildNodePart + ExprPart
_setTemplateInstance(TemplateInstance);
_setExprTemplateInstance(TemplateInstance);
