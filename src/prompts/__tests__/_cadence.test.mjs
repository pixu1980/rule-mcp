

/** The cadence: full once a session, free in between, terse every Nth, configurable, opt-out. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { runSession } from "./_diet.fixture.mjs";

test("the full contract is emitted once a session, not once per tool", () => {
  const { kinds } = runSession(12);
  assert.equal(kinds[0], "full", "the first result a session sees carries the whole contract");
  assert.equal(kinds.filter((kind) => kind === "full").length, 1, "a rule already read does not become new again because a different tool answered");
});

test("between re-anchors the reminder costs nothing at all", () => {
  const { kinds } = runSession(12);
  assert.deepEqual(kinds.slice(1, 4), ["none", "none", "none"], "the calls after the first carry no reminder until the cadence comes round");
});

test("the reminder is re-anchored every Nth call, in its terse form", () => {
  const { kinds } = runSession(12);
  assert.equal(kinds[4], "terse", "the 5th call re-anchors");
  assert.equal(kinds[9], "terse", "and the 10th");
  assert.equal(kinds.filter((kind) => kind === "terse").length, 2, "twelve calls buy two re-anchors, not twelve");
});

test("the cadence is configurable, including down to every call and off", () => {
  const dense = runSession(6, { RULE_MCP_REMINDER_EVERY: "2" });
  assert.deepEqual(dense.kinds, ["full", "terse", "none", "terse", "none", "terse"], "N=2 re-anchors on even calls");

  const once = runSession(6, { RULE_MCP_REMINDER_EVERY: "0" });
  assert.deepEqual(once.kinds.slice(1), ["none", "none", "none", "none", "none"], "N=0 keeps the opening contract and never repeats it");

  const bogus = runSession(6, { RULE_MCP_REMINDER_EVERY: "not-a-number" });
  assert.equal(bogus.kinds[4], "terse", "an unreadable value falls back to the default cadence, not to silence");
});

test("the opt-out still suppresses the reminder entirely", () => {
  const { kinds, overhead } = runSession(8, { RULE_MCP_NO_REMINDER: "1" });
  assert.ok(
    kinds.every((kind) => kind === "none"),
    "RULE_MCP_NO_REMINDER=1 means no reminder on any call",
  );
  assert.equal(overhead, 0, "suppressed means free");
});
