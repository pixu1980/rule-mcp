

/** Branch coverage for entry resolution and routed-skill attribution. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { dependenciesOf, entryPathOf, routedSkillOf } from "../_entry.js";

test("an unknown tool has no entry", () => {
  assert.equal(entryPathOf("rule_tool_not_registered"), "unregistered");
});

test("a router answer without JSON falls back to the conservative digest set", () => {
  const digests = dependenciesOf("pix_tool", {}, { content: [{ text: "not json" }] });

  assert.equal(typeof digests, "object");
});

test("a router answer with a route and no alternatives names that route", () => {
  const digests = dependenciesOf("pix_tool", {}, { content: [{ text: JSON.stringify({ route: "rule-styleguide-css" }) }] });

  assert.equal(typeof digests, "object");
});

test("alternatives without a route are skipped", () => {
  const digests = dependenciesOf("pix_tool", {}, {
    content: [{ text: JSON.stringify({ alternatives: [{ route: "rule-styleguide-css" }, {}, null] }) }],
  });

  assert.equal(typeof digests, "object");
});

test("a router result without content parses as an empty answer", () => {
  assert.equal(routedSkillOf("pix_tool", {}), undefined);
});

test("a non-JSON router result has no routed skill", () => {
  assert.equal(routedSkillOf("pix_tool", { content: [{ text: "not json" }] }), undefined);
});

test("a non-string route has no routed skill", () => {
  assert.equal(routedSkillOf("pix_tool", { content: [{ text: JSON.stringify({ route: { name: "x" } }) }] }), undefined);
});

test("a routed skill is returned", () => {
  assert.equal(routedSkillOf("pix_tool", { content: [{ text: JSON.stringify({ route: "rule-styleguide-css" }) }] }), "rule-styleguide-css");
});
