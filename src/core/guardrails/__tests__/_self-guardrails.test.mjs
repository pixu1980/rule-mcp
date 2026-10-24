

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
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { checkCode } from "../index.js";
import { loadAllSkills } from "../../skills/index.js";
import "./_install.fixture.mjs";

await loadAllSkills();

/** Files that carry violating code as data, with the reason each one does. */
const CATALOGS = new Map([
  ["core/guardrails/", "the rule catalogs (shared/file-tree/framework/quality slices) quote the counterexamples they flag"],
  ["core/file-tree/", "the file-tree checker and generator carry sample trees and generated file shapes as data"],
  ["core/text/block-spacing/", "the block-spacing checker quotes the one-line blocks it forbids as examples"],
  ["_template-data.data.js", "component templates are emitted as strings, stubs included"],
  ["core/scaffold/templates/", "the template catalog quotes the markup and CSS it generates"],
  ["core/text/fingerprint/", "the fingerprint scanner quotes typographic samples in its patterns"],
  ["_fingerprint.data.js", "the British-vs-American dictionary contains the words it flags"],
  ["_read.js", "resource payloads quote the markup and template content they serve"],
  ["core/wcag-data/", "the WCAG criteria tables are reference data per guideline"],
  ["core/bm25/", "the stopword tables and filter clauses quote the words and syntax they operate on"],
]);

const SOURCE_ROOT = new URL("../../../../src", import.meta.url);

function sourceFiles(dir = SOURCE_ROOT.pathname) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    // The walk is about source: dependencies, history and fixtures are not it.
    if (entry === "node_modules" || entry === ".git") {
      continue;
    }
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
    const rel = file.slice(SOURCE_ROOT.pathname.length).replace(/^\//, "");
    const cataloguedDir = [...CATALOGS.keys()].some((key) => key.endsWith("/") && rel.startsWith(key));
    if (CATALOGS.has(fileName) || cataloguedDir) {
      continue;
    }
    const result = checkCode("rule-mcp-styleguide-javascript", readFileSync(file, "utf8"), { fileName });

    if (result.allPass) {
      continue;
    }

    const rules = result.failed.map((rule) => `${rule.id} (${(rule.detail?.[0] ?? "").split("\n", 1)[0]})`);
    failures.push(`${file.split("/src/", 2)[1]}: ${rules.join("; ")}`);
  }
  assert.deepEqual(failures, [], `the repo must pass its own guardrails:\n${failures.join("\n")}`);
});

test("the catalog exclusions still exist and still are catalogs", () => {
  const present = new Set(sourceFiles().map((file) => file.split("/").at(-1)));
  for (const [name] of CATALOGS) {
    const dirKey = name.endsWith("/");
    const exists = dirKey ? existsSync(join(SOURCE_ROOT.pathname, name)) : present.has(name);
    assert.ok(exists, `${name} is excluded but no longer exists - drop the exclusion`);
  }
  assert.ok(CATALOGS.size <= 10, "the exclusion list is a short, argued list - not a place to hide failures");
});
