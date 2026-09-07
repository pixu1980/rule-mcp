/**
 * Personas plan A.3: one role fills the template the same way every time.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { roleById } from "../../../src/core/review/roles/index.js";

test("the template is filled verbatim from the role", async () => {
  const { fillRoleTemplate } = await import("../../../src/core/review/template/index.js");
  const filled = fillRoleTemplate(roleById("security"));
  assert.ok(!filled.includes("{{"), "no placeholder survives");
  assert.match(filled, /Security Engineer/);
  assert.match(filled, /25 years of experience/, "the template stays in the wording the user wrote");
  assert.match(filled, /application security/);
  assert.match(filled, /docs\/audits\/security\.md/, "the operation contract names the trio");
  assert.match(filled, /docs\/reviews\/security\.md/);
  assert.match(filled, /docs\/plans\/security\.md/);
  assert.match(filled, /rule-backend-security/, "evidence skills are named");
  assert.match(filled, /interview mode/, "interview mode survives the translation");
  assert.match(filled, /rule_tool_plan_docs/, "the contract names the helper that does the bookkeeping, or the agent is left to remember it");
});

test("the filled template is byte-stable", async () => {
  const { fillRoleTemplate } = await import("../../../src/core/review/template/index.js");
  assert.equal(fillRoleTemplate(roleById("a11y")), fillRoleTemplate(roleById("a11y")));
});

test("overrides refine a role without editing the registry", async () => {
  const { fillRoleTemplate } = await import("../../../src/core/review/template/index.js");
  const filled = fillRoleTemplate(roleById("privacy"), {
    years: 33,
    skills: ["ePrivacy"],
    topic: "the flight recorder",
  });
  assert.match(filled, /33 years of experience/);
  assert.match(filled, /ePrivacy/);
  assert.match(filled, /the flight recorder/);
});
