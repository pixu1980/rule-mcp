/** Framework guardrail catalog: per-framework families plus the shared JS and file-tree rules. */
import { FILE_TREE_GUARDRAILS } from "../_file-tree.js";
import { REACT_GUARDRAILS } from "./_react.js";
import { VUE_GUARDRAILS } from "./_vue.js";
import { ANGULAR_GUARDRAILS } from "./_angular.js";
import { SVELTE_GUARDRAILS } from "./_svelte.js";
import { JS_GUARDRAILS } from "./js/index.js";
import { VANILLA_REACTIVE_GUARDRAILS } from "./vanilla/index.js";

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
export { JS_GUARDRAILS } from "./js/index.js";
export { VANILLA_REACTIVE_GUARDRAILS } from "./vanilla/index.js";
export { REACT_GUARDRAILS } from "./_react.js";
export { VUE_GUARDRAILS } from "./_vue.js";
export { ANGULAR_GUARDRAILS } from "./_angular.js";
export { SVELTE_GUARDRAILS } from "./_svelte.js";
