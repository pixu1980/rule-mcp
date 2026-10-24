/** Branch coverage for the optional-step catalog rows. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { extraItems } from "../_step-extras.js";

test("empty agents and rule files name the empty case", () => {
  const items = extraItems({ mode: "stdio", hasClaude: false });
  const rules = items.find((item) => item.id === "rules");
  const hooks = items.find((item) => item.id === "hooks");
  const service = items.find((item) => item.id === "service");

  assert.match(rules.detail.join("\n"), /no agent selected/u);
  assert.match(rules.detail.join("\n"), /No instruction file/u);
  assert.equal(hooks.disabled, true);
  assert.equal(service.disabled, true);
});

test("daemon mode with Claude unlocks the service and hooks rows", () => {
  const items = extraItems({
    mode: "daemon",
    hasClaude: true,
    agents: ["claude"],
    ruleFiles: ["~/.claude/CLAUDE.md"],
  });
  const hooks = items.find((item) => item.id === "hooks");
  const service = items.find((item) => item.id === "service");
  const rules = items.find((item) => item.id === "rules");

  assert.equal(hooks.disabled, false);
  assert.equal(service.disabled, false);
  assert.match(service.detail.join("\n"), /LaunchAgent/u);
  assert.match(rules.detail.join("\n"), /CLAUDE\.md/u);
});
