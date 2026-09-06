// Auto-split from src/core/guardrails/framework.js - see ./framework/index.js
import { FILE_TREE_GUARDRAILS } from "../file-tree.js";
import { REACT_GUARDRAILS } from "./react.js";
import { VUE_GUARDRAILS } from "./vue.js";
import { ANGULAR_GUARDRAILS } from "./angular.js";
import { SVELTE_GUARDRAILS } from "./svelte.js";
import { JS_GUARDRAILS_PART1 } from "./js-1.js";
import { JS_GUARDRAILS_PART2 } from "./js-2.js";
import { JS_GUARDRAILS_PART3 } from "./js-3.js";
import { JS_GUARDRAILS_PART4 } from "./js-4.js";
import { VANILLA_REACTIVE_PART1 } from "./vanilla-1.js";
import { VANILLA_REACTIVE_PART2 } from "./vanilla-2.js";

/** Reassembled framework-shared JS family (split into js-1..4 for size). */
export const JS_GUARDRAILS = [
  ...JS_GUARDRAILS_PART1,
  ...JS_GUARDRAILS_PART2,
  ...JS_GUARDRAILS_PART3,
  ...JS_GUARDRAILS_PART4,
];

/** Reassembled vanilla-reactive family (split into vanilla-1..2 for size). */
export const VANILLA_REACTIVE_GUARDRAILS = [
  ...VANILLA_REACTIVE_PART1,
  ...VANILLA_REACTIVE_PART2,
];



/** Frameworks share the JS family; the reactive family is vanilla-specific. */
export const FRAMEWORK_GUARDRAILS = {
  react: [...REACT_GUARDRAILS, ...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  vue: [...VUE_GUARDRAILS, ...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  angular: [...ANGULAR_GUARDRAILS, ...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  svelte: [...SVELTE_GUARDRAILS, ...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  solid: [...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  astro: [...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  vanilla: [...JS_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
  "vanilla-reactive": [...JS_GUARDRAILS, ...VANILLA_REACTIVE_GUARDRAILS, ...FILE_TREE_GUARDRAILS],
};

export default FRAMEWORK_GUARDRAILS;
export {REACT_GUARDRAILS} from "./react.js";
export {VUE_GUARDRAILS} from "./vue.js";
export {ANGULAR_GUARDRAILS} from "./angular.js";
export {SVELTE_GUARDRAILS} from "./svelte.js";