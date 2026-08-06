// ═══════════════════════════════════════════════════════════════════════════════
//  Core — unified exports
// ═══════════════════════════════════════════════════════════════════════════════

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

export { Store, deepClone, clonePlainValue, isObject, toPathArray, pathToString } from "./store/index.js";

export {
  html,
  render,
  model,
  repeat,
  directive,
  isDirective,
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
  ChildNodePart,
  clearRange,
  moveRangeBefore,
  isRangeBeforeReference,
  normalizeExprValue,
  inferModelProperty,
} from "./template-engine/index.js";
