// ═══════════════════════════════════════════════════════════════════════════════
//  Core — unified exports
// ═══════════════════════════════════════════════════════════════════════════════

"use strict";

export {
  StateSignal,
  ComputedSignal,
  EffectCollector,
  Signal,
  effect,
  isSignalLike,
  BaseSignal,
  schedule,
  withCollector,
  getCurrentCollector,
  pushCollector,
  popCollector,
} from "./signals/index.js";

export {
  Store,
  deepClone,
  clonePlainValue,
  isObject,
  toPathArray,
  pathToString,
} from "./store/index.js";

export {
  html,
  loadTemplate,
  loadCSS,
  render,
  registerFilter,
  FILTERS,
  parseExpression,
  evaluateExpression,
  getFromPath,
  parseArg,
  getTemplate,
  TemplateInstance,
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
} from "./template-engine/index.js";

export { vrComponent } from "./decorator/_vr-component.js";

