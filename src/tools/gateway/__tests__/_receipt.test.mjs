

/** The receipt: never replayed - fresh token, fresh expiry, bound to this call's content. */
import { mock, test } from "node:test";
import assert from "node:assert/strict";

import { ARGUMENTS, CLEAN, TTL, answerOf, cacheClear, callTool, validateApply } from "./_receipt.fixture.mjs";

test("a cache hit mints a fresh receipt, with a fresh expiry, bound to this call", async (t) => {
  cacheClear();
  const T0 = 1_700_000_000_000;
  mock.timers.enable({ apis: ["Date"], now: T0 });
  t.after(() => mock.timers.reset());

  const first = answerOf(await callTool("rule_tool_gateway", ARGUMENTS));
  assert.ok(first.receipt, "the first call must issue a receipt");

  // Four minutes later, inside the first receipt's lifetime: the core is a hit.
  const later = T0 + 240_000;
  mock.timers.setTime(later);
  const second = answerOf(await callTool("rule_tool_gateway", ARGUMENTS));
  assert.ok(second.receipt, "a cache hit must still issue a receipt");
  assert.equal(validateApply(second.receipt, ARGUMENTS.files, later).valid, true, "the replayed call's receipt must be usable now");

  // Past the first receipt's expiry, inside the second's. A replayed token
  // would have died with the first one.
  const afterFirstExpiry = T0 + TTL + 1000;
  assert.equal(validateApply(first.receipt, ARGUMENTS.files, afterFirstExpiry).valid, false, "the first receipt must expire on its own schedule");
  assert.equal(validateApply(second.receipt, ARGUMENTS.files, afterFirstExpiry).valid, true, "the second receipt's expiry must be measured from the call that minted it");
});

test("a receipt from a cache hit binds the content passed on that call", async (t) => {
  cacheClear();
  const T0 = 1_700_000_000_000;
  mock.timers.enable({ apis: ["Date"], now: T0 });
  t.after(() => mock.timers.reset());

  const answer = answerOf(await callTool("rule_tool_gateway", ARGUMENTS));
  const tampered = [{ path: "src/sum.js", content: `${CLEAN}\nexport const backdoor = 1;\n` }];

  assert.equal(validateApply(answer.receipt, tampered, T0).valid, false, "a receipt must not authorize other content");
  assert.equal(validateApply(answer.receipt, [{ path: "src/elsewhere.js", content: CLEAN }], T0).valid, false, "a receipt must not authorize another destination");
});
