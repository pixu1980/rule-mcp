/**
 * @module test/gateway
 *
 * Tests for the rule_tool_gateway receipt system (issue / validate).
 * Focus: content binding AND TTL enforcement at validation time.
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

console.log("=== Gateway Receipt Tests ===\n");

const { issueReceipt, validateReceipt } = await import("../../../../src/tools/gateway/index.js");

const T0 = 1_000_000; // injected clock base (ms)
const TTL = 300_000;

// ── Valid immediately ──
const t1 = issueReceipt("const a = 1;", "rule-frontend-react", true, T0);
check("valid at issue time", validateReceipt(t1, "const a = 1;", T0).valid === true);

// ── Code-hash binding: modified code is rejected ──
const mismatch = validateReceipt(t1, "const a = 2;", T0);
check("modified code rejected", mismatch.valid === false && /hash/i.test(mismatch.reason));

// ── TTL enforced at validation time ──
const t2 = issueReceipt("const b = 2;", "rule-frontend-vue", true, T0);
check("valid just before expiry", validateReceipt(t2, "const b = 2;", T0 + TTL - 1).valid === true);

const t3 = issueReceipt("const c = 3;", "rule-frontend-svelte", true, T0);
const expired = validateReceipt(t3, "const c = 3;", T0 + TTL + 1);
check("expired receipt rejected", expired.valid === false && /expired/i.test(expired.reason));

// ── Unknown token rejected ──
check("unknown token rejected", validateReceipt("deadbeef", "x", T0).valid === false);

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
