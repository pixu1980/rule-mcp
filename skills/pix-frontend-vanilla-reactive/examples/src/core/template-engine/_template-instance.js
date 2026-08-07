// ═══════════════════════════════════════════════════════════════════════════════
//  PART 3d - Template Parser (getTemplate) + TemplateInstance
// ═══════════════════════════════════════════════════════════════════════════════

import { parseExpression, evaluateExpression } from "./_expression-parser.js";
import { ChildNodePart } from "./_child-node-part.js";
import { AttributePart } from "./_attribute-part.js";
import { PropertyPart } from "./_property-part.js";
import { EventPart } from "./_event-part.js";
import { ExprPart } from "./_expr-part.js";
import { ForPart } from "./_for-part.js";
import { IfPart } from "./_if-part.js";

// Resolve the circular dependency: ChildNodePart needs TemplateInstance
import { _setTemplateInstance } from "./_child-node-part.js";

const templateCache = new WeakMap();
const VAL_MARKER_RE = /^val:(\d+)$/;
const EXPR_MARKER_RE = /^expr:(\d+)$/;
const ATTR_END_RE = /([.@]?[-\w:]+)\s*=\s*(?:"|'|)?$/;

function getNodePath(node, root) {
  const path = [];
  let cur = node;
  while (cur && cur !== root) {
    const p = cur.parentNode;
    if (!p) break;
    let i = 0;
    let c = cur;
    while (c.previousSibling) {
      c = c.previousSibling;
      i++;
    }
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

export function getTemplate(strings) {
  let rec = templateCache.get(strings);
  if (rec) return rec;

  // Step 1: Assemble full HTML - use __attr_N__ for attribute positions,
  //         <!--val:N--> for child positions (--> breaks HTML attribute parsing)
  let markup = "";
  for (let i = 0; i < strings.length - 1; i++) {
    const chunk = strings[i];
    markup += chunk;
    if (ATTR_END_RE.test(chunk)) {
      markup += `__attr_${i}__`;
    } else {
      markup += `<!--val:${i}-->`;
    }
  }
  markup += strings[strings.length - 1];

  // Step 2: Extract <for>, <if> directive regions from markup
  const directives = [];
  let cleanedMarkup = markup;
  let directiveIdCounter = 0;

  cleanedMarkup = cleanedMarkup.replace(/<for\s+([^>]*)>([\s\S]*?)<\/for>/gi, (full, attrs, inner) => {
    const id = directiveIdCounter++;
    const eachMatch = attrs.match(/each\s*="([^"]*)"/);
    // render= carries a __attr_N__ marker (function reference)
    const renderMatch = attrs.match(/render\s*=\s*__attr_(\d+)__/);
    directives.push({
      kind: "for",
      id,
      each: eachMatch ? eachMatch[1] : "",
      inner,
      renderAttrIdx: renderMatch ? Number(renderMatch[1]) : -1,
    });
    return `<!--dir:${id}-->`;
  });
  cleanedMarkup = cleanedMarkup.replace(/<if\s+([^>]*)>([\s\S]*?)<\/if>/gi, (full, attrs, inner) => {
    const id = directiveIdCounter++;
    const condMatch = attrs.match(/condition\s*="([^"]*)"/);
    directives.push({ kind: "if", id, condition: condMatch ? condMatch[1] : "", inner });
    return `<!--dir:${id}-->`;
  });

  // Step 3: Replace {{ expr }} with <!--expr:IDX--> markers
  let exprCounter = 0;
  const allExprMarkers = [];
  let processed = "";
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

  // Step 4: Parse into DOM template and walk
  const template = document.createElement("template");
  template.innerHTML = processed;

  const descriptors = [];
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  let walkNode;
  while ((walkNode = walker.nextNode())) {
    if (walkNode.nodeType === Node.COMMENT_NODE) {
      // val marker
      const vm = walkNode.data.match(VAL_MARKER_RE);
      if (vm) {
        descriptors.push({ kind: "val", index: Number(vm[1]), path: getNodePath(walkNode, template.content) });
        continue;
      }
      // expr marker
      const em = walkNode.data.match(EXPR_MARKER_RE);
      if (em) {
        const idx = Number(em[1]);
        const info = allExprMarkers.find((e) => e.index === idx);
        descriptors.push({
          kind: "expr",
          index: idx,
          parsedExpr: info?.parsedExpr || parseExpression(""),
          path: getNodePath(walkNode, template.content),
        });
        continue;
      }
      // dir marker
      const dm = walkNode.data.match(/^dir:(\d+)$/);
      if (dm) {
        const dirId = Number(dm[1]);
        const dir = directives.find((d) => d.id === dirId);
        if (dir) {
          descriptors.push({
            kind: dir.kind,
            index: dirId,
            path: getNodePath(walkNode, template.content),
            itemVar: dir.each ? dir.each.match(/^\s*([a-zA-Z_$][\w$]*)\s+in\s+/)?.[1] : "item",
            itemsExprStr: dir.each ? dir.each.replace(/^\s*[a-zA-Z_$][\w$]*\s+in\s+/, "").trim() : "",
            conditionStr: dir.condition || "",
            innerTemplate: dir.inner || "",
            renderAttrIdx: dir.renderAttrIdx ?? -1,
          });
        }
        continue;
      }
      continue;
    }

    if (walkNode.nodeType === Node.ELEMENT_NODE) {
      for (const attr of [...walkNode.attributes]) {
        const attrVal = attr.value;
        // {{ }} in attribute value
        const exMatch = attrVal.match(/\{\{([^}]+)\}\}/);
        if (exMatch) {
          const idx = exprCounter++;
          const parsedExpr = parseExpression(exMatch[1].trim());
          const rawName = attr.name;
          let partType = "attribute",
            name = rawName;
          if (rawName.startsWith(".")) {
            partType = "property";
            name = rawName.slice(1);
          } else if (rawName.startsWith("@")) {
            partType = "event";
            name = rawName.slice(1);
          }
          descriptors.push({
            kind: "attrExpr",
            partType,
            index: idx,
            name,
            rawName,
            parsedExpr,
            path: getNodePath(walkNode, template.content),
          });
        }
        // __attr_N__ marker (${} in attributes)
        const valAttrMatch = attrVal.match(/^__attr_(\d+)__$/);
        if (valAttrMatch) {
          const idx = Number(valAttrMatch[1]);
          const rawName = attr.name;
          let partType = "attribute",
            name = rawName;
          if (rawName.startsWith(".")) {
            partType = "property";
            name = rawName.slice(1);
          } else if (rawName.startsWith("@")) {
            partType = "event";
            name = rawName.slice(1);
          }
          descriptors.push({
            kind: partType,
            index: idx,
            name,
            rawName,
            path: getNodePath(walkNode, template.content),
          });
        }
      }
    }
  }

  rec = { template, descriptors, exprCount: exprCounter };
  templateCache.set(strings, rec);
  return rec;
}

// ── TemplateInstance ──────────────────────────────────────────────────────────
export class TemplateInstance {
  constructor(strings) {
    this.strings = strings;
    const rec = getTemplate(strings);
    this.fragment = rec.template.content.cloneNode(true);
    this.parts = new Map();
    this.exprParts = [];
    this.forParts = [];
    this.ifParts = [];

    const resolved = rec.descriptors.map((d) => ({
      descriptor: d,
      node: d.path ? resolveNodePath(this.fragment, d.path) : null,
    }));

    for (const { descriptor, node } of resolved) {
      switch (descriptor.kind) {
        case "val":
        case "attribute":
        case "property":
        case "event": {
          let part;
          if (descriptor.kind === "val") {
            const s = document.createComment(`start:${descriptor.index}`);
            const e = document.createComment(`end:${descriptor.index}`);
            node.replaceWith(s, e);
            part = new ChildNodePart(s, e);
          } else if (descriptor.kind === "attribute") {
            node.removeAttribute(descriptor.rawName);
            part = new AttributePart(node, descriptor.name);
          } else if (descriptor.kind === "property") {
            node.removeAttribute(descriptor.rawName);
            part = new PropertyPart(node, descriptor.name);
          } else if (descriptor.kind === "event") {
            node.removeAttribute(descriptor.rawName);
            part = new EventPart(node, descriptor.name);
          }
          if (part) this.parts.set(descriptor.index, part);
          break;
        }
        case "expr": {
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
        case "attrExpr": {
          if (node) {
            node.removeAttribute(descriptor.rawName);
            this.exprParts.push({
              index: descriptor.index,
              exprPart: new AttributePart(node, descriptor.name),
              parsedExpr: descriptor.parsedExpr,
              isAttr: true,
            });
          }
          break;
        }
        case "for": {
          const s = document.createComment(`for:${descriptor.index}:s`);
          const e = document.createComment(`for:${descriptor.index}:e`);
          if (node) node.replaceWith(s, e);
          // renderFn comes from values[renderAttrIdx] (a ${} slot)
          const renderFn = descriptor.renderAttrIdx >= 0 ? null : null;
          const forPart = new ForPart(
            s,
            e,
            descriptor.itemVar,
            parseExpression(descriptor.itemsExprStr || ""),
            descriptor.innerTemplate || "",
            null,
          );
          // Store renderAttrIdx so updateWithContext can pass the fn
          forPart._renderAttrIdx = descriptor.renderAttrIdx;
          this.forParts.push(forPart);
          break;
        }
        case "if": {
          const s = document.createComment(`if:${descriptor.index}:s`);
          const e = document.createComment(`if:${descriptor.index}:e`);
          if (node) node.replaceWith(s, e);
          this.ifParts.push(
            new IfPart(s, e, parseExpression(descriptor.conditionStr || ""), descriptor.innerTemplate || ""),
          );
          break;
        }
      }
    }
  }

  updateWithContext(values, context) {
    // 1. Update ${} slots
    for (let i = 0; i < values.length; i++) {
      const part = this.parts.get(i);
      if (part) part.setValue(values[i]);
    }
    // 2. Update {{ }} expr parts
    for (const { exprPart, parsedExpr, isAttr } of this.exprParts) {
      if (isAttr) {
        const val = evaluateExpression(parsedExpr, context);
        exprPart.commit(
          val,
          parsedExpr.filters.length > 0 && parsedExpr.filters[parsedExpr.filters.length - 1].name === "raw",
        );
      } else {
        exprPart.setValue(parsedExpr, context);
      }
    }
    // 3. Init <for> / <if> - pass renderFn from ${} values
    for (const fp of this.forParts) {
      if (fp._renderAttrIdx >= 0) fp.renderFn = values[fp._renderAttrIdx];
      fp.init(context);
    }
    for (const ip of this.ifParts) ip.init(context);
  }

  update(values) {
    for (let i = 0; i < values.length; i++) {
      const part = this.parts.get(i);
      if (part) part.setValue(values[i]);
    }
  }
}

// Resolve circular dep: register TemplateInstance with ChildNodePart
_setTemplateInstance(TemplateInstance);
