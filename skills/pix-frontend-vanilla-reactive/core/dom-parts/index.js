// ═══════════════════════════════════════════════════════════════════════════════
//  DOM Parts — public API
//  ═══════════════════════════════════════════════════════════════════════════════
//  These are the individual DOMPart classes used by the template engine.
//  They can also be used standalone for direct DOM manipulation.
//  ═══════════════════════════════════════════════════════════════════════════════

"use strict";

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
  clearRange,
  moveRangeBefore,
  isRangeBeforeReference,
  normalizeExprValue,
  inferModelProperty,
} from "./_parts.js";

