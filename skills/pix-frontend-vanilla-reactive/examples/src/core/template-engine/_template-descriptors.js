// Template Engine - Walk parsed template DOM into part descriptors

import { parseExpression } from "./_expression-parser.js";
import { getNodePath } from "./_node-path.js";

const VAL_MARKER_RE = /^val:(\d+)$/;
const EXPR_MARKER_RE = /^expr:(\d+)$/;

/**
 * @param {DocumentFragment} content
 * @param {{ directives: object[], allExprMarkers: object[], exprCounter: number }} meta
 * @returns {{ descriptors: object[], exprCount: number }}
 */
export function collectTemplateDescriptors(content, meta) {
  const { directives, allExprMarkers } = meta;
  let { exprCounter } = meta;
  const descriptors = [];
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  let walkNode;
  while ((walkNode = walker.nextNode())) {
    if (walkNode.nodeType === Node.COMMENT_NODE) {
      // val marker
      const vm = walkNode.data.match(VAL_MARKER_RE);
      if (vm) {
        descriptors.push({ kind: "val", index: Number(vm[1]), path: getNodePath(walkNode, content) });
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
          path: getNodePath(walkNode, content),
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
            path: getNodePath(walkNode, content),
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
            path: getNodePath(walkNode, content),
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
            path: getNodePath(walkNode, content),
          });
        }
      }
    }
  }

  return { descriptors, exprCount: exprCounter };
}
