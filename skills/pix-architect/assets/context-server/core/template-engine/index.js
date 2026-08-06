// ═══════════════════════════════════════════════════════════════════════════════
//  Template Engine public API
// ═══════════════════════════════════════════════════════════════════════════════

export { html, directive, model, repeat, isDirective } from "./_template-helpers.js";
export { render } from "./_template.js";
export { registerFilter, FILTERS, utilSlug } from "./_filters.js";
export { parseExpression, evaluateExpression, getFromPath, parseArg } from "./_expression-parser.js";
export { getTemplate, TemplateInstance } from "./_template-instance.js";
export { Part, AttributePart, PropertyPart, EventPart, ExprPart, ForPart, IfPart, ChildNodePart } from "./_parts.js";
export {
  clearRange,
  moveRangeBefore,
  isRangeBeforeReference,
  normalizeExprValue,
  inferModelProperty,
} from "./_range.js";
