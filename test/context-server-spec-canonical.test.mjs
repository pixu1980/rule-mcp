// test/context-server-spec-canonical.test.mjs
// Phase 2 Task 3: context-server.mjs now serves the canonical wizard-spec.json
// + the shared rule-architect-web/interview.js instead of its own stale
// placeholders.json / interview.js copies. This test locks that consolidation
// in place: the stale placeholder schema must be gone, the shared UI files
// must NOT exist as symlinks (or copies) under assets/context-server/ —
// symlinks get dropped by `pnpm pack`, breaking registry installs, so
// context-server.mjs serves them BY PATH from the canonical
// rule-architect-web/ dir instead — and the canonical spec must carry the
// domain-sketch onboarding step context-server previously lacked.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CONTEXT_SERVER_DIR = fileURLToPath(new URL("../skills/rule-architect/assets/context-server/", import.meta.url));
const WIZARD_SPEC_PATH = new URL("../skills/rule-architect/wizard-spec.json", import.meta.url);

test("stale placeholders.json no longer exists under assets/context-server/", () => {
  assert.equal(existsSync(CONTEXT_SERVER_DIR + "placeholders.json"), false, "assets/context-server/placeholders.json should have been removed");
});

for (const file of ["interview.js", "interview.css", "index.html"]) {
  test(`assets/context-server/${file} does not exist — context-server serves it by path from rule-architect-web/`, () => {
    const linkPath = CONTEXT_SERVER_DIR + file;
    assert.equal(existsSync(linkPath), false, `${linkPath} should not exist (no symlink, no copy) — pnpm pack drops symlinks from the published tarball`);
  });
}

test("canonical wizard-spec.json has the domain-sketch onboarding step (previously missing from context-server)", () => {
  const wizardSpec = JSON.parse(readFileSync(WIZARD_SPEC_PATH, "utf-8"));
  const stepKeys = wizardSpec.steps.map((step) => step.key);
  assert.ok(stepKeys.includes("step-1-domain-sketch"), `wizard-spec.json steps must include step-1-domain-sketch, found: ${stepKeys.join(", ")}`);
});
