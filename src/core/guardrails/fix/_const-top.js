

/** @module scripts/fix/self-guardrails/const-top - js-const-top: blank after a declaration group */

import { CONTINUES, DECL } from "./_decl.js";

export function apply(text) {
  let changed = false;

  // blank between declarations and following statements (per scope start):
  const scope = text.split("\n");
  const sOut = [];

  for (let i = 0; i < scope.length; i++) {
    sOut.push(scope[i]);
    const isDeclGroupEnd =
      i + 1 < scope.length &&
      DECL.test(scope[i]) &&
      !DECL.test(scope[i + 1]) &&
      !CONTINUES(scope[i + 1]) &&
      scope[i + 1].trim() !== "" &&
      !scope[i + 1].trimStart().startsWith("//");

    if (!isDeclGroupEnd || sOut.at(-1) === "") {
      continue;
    }

    sOut.push("");
    changed = true;
  }

  text = sOut.join("\n").replaceAll(/\n{3,}/g, "\n\n");

  return { text, changed };
}
