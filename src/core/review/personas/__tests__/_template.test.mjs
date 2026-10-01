

/**
 * Personas plan A.3: one role fills the template the same way every time.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { roleById } from "../../roles/index.js";

test("the template is filled verbatim from the role", async () => {
  const { fillRoleTemplate } = await import("../../template/index.js");
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
  assert.match(filled, /rule_tool_impersonation/, "the contract names the helper that does the bookkeeping, or the agent is left to remember it");
});

test("the filled template is byte-stable", async () => {
  const { fillRoleTemplate } = await import("../../template/index.js");
  assert.equal(fillRoleTemplate(roleById("a11y")), fillRoleTemplate(roleById("a11y")));
});

test("overrides refine a role without editing the registry", async () => {
  const { fillRoleTemplate } = await import("../../template/index.js");
  const filled = fillRoleTemplate(roleById("privacy"), {
    years: 33,
    skills: ["ePrivacy"],
    topic: "the flight recorder",
  });
  assert.match(filled, /33 years of experience/);
  assert.match(filled, /ePrivacy/);
  assert.match(filled, /the flight recorder/);
});

test("a topic becomes the binding scope of the run", async () => {
  const { fillRoleTemplate } = await import("../../template/index.js");
  const filled = fillRoleTemplate(roleById("security"), { topic: "the SSE daemon token handling", operation: "audit" });

  assert.match(filled, /run an audit of the SSE daemon token handling/, "the opening action names the scope, not the project");
  assert.match(filled, /## Scope: binding/, "the scope section exists");
  assert.match(filled, /covers ONLY: the SSE daemon token handling/, "the scope is stated verbatim");
  assert.match(filled, /## Lenses, applied to the scope above/, "the lenses become the how, not the what");
  assert.match(filled, /not applicable/, "a lens without material in scope has an exit");
  assert.match(filled, /Out of scope observations/, "the escape valve exists");
  assert.match(filled, /stay untouched rather than flipped to resolved/, "scoped bookkeeping is protected");
  assert.ok(!filled.includes("Focus this run on:"), "the old soft focus line is gone");
  assert.ok(filled.indexOf("## Scope: binding") < filled.indexOf("## Lenses"), "the scope comes before the lenses");
});

test("a scoped run resolves its scope through tokensave when available", async () => {
  const { fillRoleTemplate } = await import("../../template/index.js");

  const unknown = fillRoleTemplate(roleById("security"), { topic: "the CLI", operation: "audit" });
  assert.match(unknown, /## Resolve the scope/, "a scoped run maps its scope to files first");
  assert.match(unknown, /tokensave_status/, "availability is checked, not assumed");
  assert.match(unknown, /tokensave_context/, "the scope is the query");

  const available = fillRoleTemplate(roleById("security"), { topic: "the CLI", operation: "audit", tokensave: "available" });
  assert.match(available, /tokensave is initialized in this project/, "the generator states what it detected");
  assert.ok(!available.includes("tokensave_status"), "no availability check when the generator already knows");
});

test("without a topic the template is unchanged", async () => {
  const { fillRoleTemplate } = await import("../../template/index.js");
  const filled = fillRoleTemplate(roleById("security"), { operation: "audit" });

  assert.match(filled, /run an audit of the project/, "the default scope is the whole project");
  assert.match(filled, /## What this role looks at/, "the lens header stays as written");
  assert.ok(!filled.includes("## Scope: binding"), "no scope section without a topic");
  assert.ok(!filled.includes("## Resolve the scope"), "no scope resolution without a topic");
});
