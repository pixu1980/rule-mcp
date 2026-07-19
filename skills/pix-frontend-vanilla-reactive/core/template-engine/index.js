// ═══════════════════════════════════════════════════════════════════════════════
//  Template Engine public API
// ═══════════════════════════════════════════════════════════════════════════════

export { html } from './_template-helpers.js';
export { loadTemplate } from './_load-template.js';
export { withContext, compose } from './_with-context.js';
export { render } from './_template.js';
export { registerFilter, FILTERS, utilSlug } from './_filters.js';
export { parseExpression, evaluateExpression, getFromPath, parseArg } from './_expression-parser.js';
export { getTemplate, TemplateInstance } from './_template-instance.js';
export {
  Part,
  AttributePart,
  PropertyPart,
  EventPart,
  ExprPart,
  ForPart,
  IfPart,
  SwitchPart,
  ChildNodePart,
} from '../dom-parts/_parts.js';
export { clearRange, moveRangeBefore, isRangeBeforeReference, normalizeExprValue, inferModelProperty } from '../dom-parts/_range.js';
