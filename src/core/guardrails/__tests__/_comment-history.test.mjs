/**
 * @module test/comment-history.test
 *
 * A comment says what the code does. The story of how it got there belongs to
 * the ADR log and to git, and repeating it in a comment means two records that
 * drift, with the one nobody regenerates going stale first.
 *
 * The pattern has to be narrow. "No longer accepting connections" describes
 * runtime behavior and must pass; "this used to be two functions" describes the
 * file's own past and must not. Both directions are asserted, because a rule
 * that fires on ordinary prose gets switched off within a week.
 */

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("comment history test");

const { checkCode } = await import("../index.js");
const { getGuardrails } = await import("../index.js");
import "./_install.fixture.mjs";

const RULE = "js-comment-no-history";
const context = { framework: "vanilla", isComponent: false, fileName: "sample.js" };
const fires = (code) => checkCode("rule-styleguide-javascript", code, context).failed.some((entry) => entry.id === RULE);

// ── The rule exists and is shared, so it is not one language's opinion ──

const ids = new Set(getGuardrails("rule-styleguide-javascript").map((g) => g.id));
check("T0 the rule is registered", ids.has(RULE));
check(
  "T0.1 and it is shared with the CSS and backend skills",
  new Set(getGuardrails("rule-styleguide-css").map((g) => g.id)).has(RULE) && new Set(getGuardrails("rule-backend-node").map((g) => g.id)).has(RULE),
);

// ── What it must catch ──

const HISTORY = [
  ["a line comment about the file's past", "// This used to be two functions.\nexport const a = 1;\n"],
  ["a block comment about the file's past", "/**\n * It used to mint the id here.\n */\nexport const b = 2;\n"],
  ["previously", "// Previously this returned null.\nexport const c = 3;\n"],
  ["it was", "/** The cache was a single tier before. */\nexport const d = 4;\n"],
  ["had been", "// The flag had been ignored for three phases.\nexport const e = 5;\n"],
  ["we changed", "// We changed this to a Map.\nexport const f = 6;\n"],
  ["instead of the old", "// A Set instead of the old array scan.\nexport const g = 7;\n"],
];

for (const [label, code] of HISTORY) {
  check(`T1 catches ${label}`, fires(code));
}

// ── What it must not touch ──

const FINE = [
  ["runtime state", "// The socket is no longer accepting connections at this point.\nexport const h = 8;\n"],
  ["a described behavior", "/**\n * Returns the entry, or undefined when nothing is stored.\n */\nexport const i = 9;\n"],
  ["a reason for the current shape", "// A Set, because membership is checked inside a loop.\nexport const j = 10;\n"],
  ["the word history in a domain sense", "// Reads the commit history for the range.\nexport const k = 11;\n"],
  ["a deprecation notice", "/** @deprecated Use writeText instead. */\nexport const l = 12;\n"],
  ["prose containing was in a condition", "// True when the response was accepted by the server.\nexport const m = 13;\n"],
];

for (const [label, code] of FINE) {
  check(`T2 leaves ${label} alone`, !fires(code));
}

// ── It reads comments, not code ──

check("T3 a string literal is not a comment", !fires('export const n = "this used to be two functions";\n'));

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
