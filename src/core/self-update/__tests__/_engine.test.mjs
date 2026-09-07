/** T1-T4: fast-forward + classification, dirty-tree guard, and the opt-out, on real repos. */
import { strict as assert } from "node:assert";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { makeClonePair, pushUpstreamChange, runUpdateIn } from "./_update.fixture.mjs";

console.log("self-update engine test: pull and guards");

// ── T1: skills-only upstream change → fast-forwarded, classified as skills ──
{
  const { clone, seed, base, upstream } = makeClonePair();
  pushUpstreamChange(seed, { "skills/rule/SKILL.md": "v2\n" });
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.updated, true, "should fast-forward a skills-only change");
  assert.equal(r.changedSkills, true, "skills change detected");
  assert.equal(r.changedCode, false, "no code change");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ skills-only change fast-forwards and is classified as skills");
}

// ── T2: code change classified as code ──
{
  const { clone, seed, base, upstream } = makeClonePair();
  pushUpstreamChange(seed, { "src/server/index.js": "// v2\n" });
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.updated, true, "should fast-forward a code change");
  assert.equal(r.changedCode, true, "code change detected");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ code change is classified as code");
}

// ── T3: dirty working tree is never touched ──
{
  const { clone, seed, base, upstream } = makeClonePair();
  pushUpstreamChange(seed, { "skills/rule/SKILL.md": "v2\n" });
  writeFileSync(join(clone, "skills", "rule", "SKILL.md"), "local edit\n");
  const r = runUpdateIn(clone, { RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.updated, false, "must not update a dirty tree");
  assert.equal(r.reason, "dirty-tree", "reports dirty-tree");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ dirty working tree is skipped (local work preserved)");
}

// ── T4: opt-out env disables the update ──
{
  const { clone, seed, base, upstream } = makeClonePair();
  pushUpstreamChange(seed, { "skills/rule/SKILL.md": "v2\n" });
  const r = runUpdateIn(clone, { RULE_MCP_NO_AUTOUPDATE: "1", RULE_MCP_UPDATE_REMOTE: upstream });
  assert.equal(r.skipped, true, "opt-out skips");
  assert.equal(r.reason, "disabled", "reports disabled");
  rmSync(base, { recursive: true, force: true });
  console.log("  ✅ RULE_MCP_NO_AUTOUPDATE disables the update");
}
