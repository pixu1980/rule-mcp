/**
 * Hardening 4.1 (F-A1): this repository passes its own guardrails.
 *
 * The 2026-09-03 audit found 79 of 79 files under src/ failing - a guardrail
 * product whose own source cannot pass its checks teaches everyone downstream
 * to ignore the output. Every failure was then either a rule bug (fixed, with
 * paired tests in guardrails-false-positives.test.mjs) or a real gap in this
 * code (fixed here). This test keeps it that way.
 *
 * The exclusions below are catalogs of counterexamples: files whose DATA is
 * the violating code the rules hunt for. Checking them means checking the
 * examples, not the file.
 */
import { strict as assert } from "node:assert";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { checkCode } from "../src/core/guardrails.js";
import { loadAllSkills } from "../src/core/skills.js";

await loadAllSkills();

/** Files that carry violating code as data, with the reason each one does. */
const CATALOGS = new Map([
  ["quality.js", "every ported rule's counterexample lives here as a pattern or a sample"],
  ["shared.js", "every shared rule's counterexample lives here (catalog grouping)"],
  ["framework.js", "the framework rule catalogs quote the markup and CSS they generate"],
  ["file-tree.js", "file-tree rules carry their own sample trees and generated file shapes as data"],
  ["block-spacing.js", "the block-spacing checker quotes the one-line blocks it forbids as examples"],
  ["file-tree.js", "file-tree rules carry their own sample trees and generated file shapes as data"],
  ["block-spacing.js", "the block-spacing checker quotes the one-line blocks it forbids as examples"],
  ["template-data.js", "component templates are emitted as strings, stubs included"],
  ["templates.js", "the template catalog quotes the markup and CSS it generates"],
  ["fingerprint.js", "the British-vs-American dictionary contains the words it flags"],
  ["wcag-data.js", "the WCAG criteria table is reference data"],
]);

const SOURCE_ROOT = new URL("../src", import.meta.url);

function sourceFiles(dir = SOURCE_ROOT.pathname) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (path.endsWith(".js")) {
      found.push(path);
    }
  }

  return found;
}

test("every source file passes the JavaScript guardrails", () => {
  const failures = [];
  for (const file of sourceFiles()) {
    const fileName = file.split("/").at(-1);
    if (CATALOGS.has(fileName)) {
      continue;
    }
    const result = checkCode("rule-styleguide-javascript", readFileSync(file, "utf8"), { fileName });
    if (!result.allPass) {
      const rules = result.failed.map((rule) => `${rule.id} (${(rule.detail?.[0] ?? "").split("\n", 1)[0]})`);
      failures.push(`${file.split("/src/", 2)[1]}: ${rules.join("; ")}`);
    }
  }
  assert.deepEqual(failures, [], `the repo must pass its own guardrails:\n${failures.join("\n")}`);
});

test("the catalog exclusions still exist and still are catalogs", () => {
  const present = new Set(sourceFiles().map((file) => file.split("/").at(-1)));
  for (const [name] of CATALOGS) {
    assert.ok(present.has(name), `${name} is excluded but no longer exists - drop the exclusion`);
  }
  assert.ok(CATALOGS.size <= 10, "the exclusion list is a short, argued list - not a place to hide failures");
});
