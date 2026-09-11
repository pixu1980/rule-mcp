

/** detectLocalRepo on missing, foreign and broken manifests, plus a starved preflight. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { detectLocalRepo } from "../_preflight.js";

test("detectLocalRepo reads the manifest name, and nothing else", () => {
  const bare = mkdtempSync(join(tmpdir(), "rule-preflight-bare-"));
  const foreign = mkdtempSync(join(tmpdir(), "rule-preflight-foreign-"));
  const local = mkdtempSync(join(tmpdir(), "rule-preflight-local-"));
  const broken = mkdtempSync(join(tmpdir(), "rule-preflight-broken-"));

  try {
    writeFileSync(join(foreign, "package.json"), JSON.stringify({ name: "something-else" }));
    writeFileSync(join(local, "package.json"), JSON.stringify({ name: "rule-mcp" }));
    writeFileSync(join(broken, "package.json"), "{ not json");

    assert.equal(detectLocalRepo(bare), false, "no manifest is not the checkout");
    assert.equal(detectLocalRepo(foreign), false, "a foreign name is not the checkout");
    assert.equal(detectLocalRepo(local), true, "the manifest name marks the checkout");
    assert.equal(detectLocalRepo(broken), false, "an unreadable manifest is not the checkout");
  } finally {
    for (const dir of [bare, foreign, local, broken]) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("a starved environment fails the binary and package manager checks and warns on git", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  // A directory no binary could hide in: nothing on PATH, so every lookup
  // answers "" and the repo root is the empty dir itself.
  const empty = mkdtempSync(join(tmpdir(), "rule-preflight-path-"));
  const root = mkdtempSync(join(tmpdir(), "rule-preflight-root-"));

  try {
    const out = execFileSync(process.execPath, [join(here, "_preflight-child.fixture.mjs")], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: empty, RULE_MCP_REPO_ROOT: root },
    });
    const { checks, context } = JSON.parse(out);
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));

    assert.equal(byId["package-manager"].status, "fail", "no pnpm and no npm fails the check");
    assert.match(byId["package-manager"].detail, /neither pnpm nor npm/, "the detail names the missing tools");
    assert.equal(byId.git.status, "warn", "a missing git warns instead of failing");
    assert.match(byId.git.detail, /not found/, "the git detail says it is absent");
    assert.equal(byId.binary.status, "fail", "no local bin and no working shim fails the binary check");
    assert.match(byId.binary.detail, /no local bin/, "the binary detail says what is missing");
    assert.equal(byId.shim.status, "warn", "an absent shim warns");
    assert.match(byId.shim.detail, /absent/, "the shim detail says it will be created");
    assert.equal(context.blocked, true, "the failures block the wizard");
  } finally {
    rmSync(empty, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});
