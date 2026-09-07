/**
 * @module test/css-flex-first/fixture.test
 *
 * Flex is the default layout tool; grid is the exception that has to earn it.
 *
 * The rule: if the same visual result is reachable with flex, flex is what gets
 * written. `display: grid` is for the four things flex genuinely cannot do -
 * named template areas, subgrid, explicit item placement or overlap, and
 * auto-fit/auto-fill tracks - plus the case a human states in a comment.
 *
 * A rule that lives in one skill is a suggestion. These tests hold it in every
 * place it has to be true at once: the blocking guardrail, the generated
 * component templates, every fenced CSS block in the whole skill corpus, the
 * per-call reminder, the route payload, the installed agent rules and the docs.
 */

import test from "node:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

export const root = fileURLToPath(new URL("../../..", import.meta.url));

export const { SHARED_GUARDRAILS } = await import("../../../src/core/guardrails/index.js");
export const { getGuardrails, checkCode } = await import("../../../src/core/guardrails/index.js");
export const { FLEX_FIRST } = await import("../../../src/core/directive.js");

export const GUARDRAIL_ID = "css-flex-first";

/** Run only the flex-first guardrail over a CSS body. */
export function run(css, fileName = "_Component.css") {
  const guardrail = SHARED_GUARDRAILS.find((g) => g.id === GUARDRAIL_ID);

  return guardrail.check(css, fileName ? { fileName } : {});
}

export function skillDocs(dir = join(root, "skills"), found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      skillDocs(path, found);
    } else if (entry.name.endsWith(".md")) {
      found.push(path);
    }
  }

  return found;
}
