// test/context-server-templates-canonical.test.mjs
// Guards that context-server.mjs (and everything else in the pipeline) reads
// templates from the single canonical skills/rule-architect/templates.json
// - not a stale local duplicate. The duplicate under
// assets/context-server/templates.json drifted (21 vs 23 templates) and has
// been removed; this test locks that consolidation in place.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const CANONICAL_PATH = new URL("../skills/rule-architect/templates.json", import.meta.url);
const STALE_PATH = new URL("../skills/rule-architect/assets/context-server/templates.json", import.meta.url);

test("canonical templates.json is the one context-server.mjs (and generator.mjs) serves", () => {
  const templates = JSON.parse(readFileSync(CANONICAL_PATH, "utf-8"));
  // 24 since Phase 6 Task 1 added the root-output AGENTS.md template (was 23).
  assert.equal(templates.length, 24);

  const outputs = new Set(templates.map((t) => t.output || t.path.replace(/^templates\//, "")));
  assert.ok(outputs.has("specs/12-rule-routing.md"), "missing specs/12-rule-routing.md");
  assert.ok(outputs.has("specs/10-devops-toolchain.md"), "missing specs/10-devops-toolchain.md");
  assert.ok(outputs.has("specs/11-process-delivery.md"), "missing specs/11-process-delivery.md");
});

test("stale local templates.json duplicate no longer exists", () => {
  assert.equal(existsSync(STALE_PATH), false, "assets/context-server/templates.json should have been removed");
});
