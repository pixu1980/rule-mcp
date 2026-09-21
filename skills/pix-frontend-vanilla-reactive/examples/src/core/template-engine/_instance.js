// Template Engine - TemplateInstance lifecycle

import { parseExpression, evaluateExpression } from "./_expression-parser.js";
import { ChildNodePart } from "./_child-node-part.js";
import { AttributePart } from "./_attribute-part.js";
import { PropertyPart } from "./_property-part.js";
import { EventPart } from "./_event-part.js";
import { ExprPart } from "./_expr-part.js";
import { ForPart } from "./_for-part.js";
import { IfPart } from "./_if-part.js";
import { getTemplate } from "./_get-template.js";
import { resolveNodePath } from "./_node-path.js";

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
          const forPart = new ForPart(s, e, descriptor.itemVar, parseExpression(descriptor.itemsExprStr || ""), descriptor.innerTemplate || "", null);
          // Store renderAttrIdx so updateWithContext can pass the fn
          forPart._renderAttrIdx = descriptor.renderAttrIdx;
          this.forParts.push(forPart);
          break;
        }
        case "if": {
          const s = document.createComment(`if:${descriptor.index}:s`);
          const e = document.createComment(`if:${descriptor.index}:e`);
          if (node) node.replaceWith(s, e);
          this.ifParts.push(new IfPart(s, e, parseExpression(descriptor.conditionStr || ""), descriptor.innerTemplate || ""));
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
        exprPart.commit(val, parsedExpr.filters.length > 0 && parsedExpr.filters[parsedExpr.filters.length - 1].name === "raw");
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
