

/** detectLocalRepo on missing, foreign and broken manifests, plus a starved preflight. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { detectLocalRepo, detectPackageManager } from "../_preflight.js";

/** Run fn with a PATH whose only entry is dir. */
function withPath(dir, fn) {
  const saved = process.env.PATH;

  process.env.PATH = dir;

  try {
    return fn();
  } finally {
    process.env.PATH = saved;
  }
}

/** A scratch dir holding an executable name whose body is given. */
function scratchBin(dir, name, body) {
  const path = join(dir, name);

  writeFileSync(path, body);
  chmodSync(path, 0o755);
}

test("detectLocalRepo reads the manifest name, and nothing else", () => {
  const bare = mkdtempSync(join(tmpdir(), "rule-mcp-preflight-bare-"));
  const foreign = mkdtempSync(join(tmpdir(), "rule-mcp-preflight-foreign-"));
  const local = mkdtempSync(join(tmpdir(), "rule-mcp-preflight-local-"));
  const broken = mkdtempSync(join(tmpdir(), "rule-mcp-preflight-broken-"));

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
  const empty = mkdtempSync(join(tmpdir(), "rule-mcp-preflight-path-"));
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-preflight-root-"));

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

test("a package manager that runs but prints nothing is still the package manager", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-preflight-quiet-"));

  try {
    scratchBin(dir, "pnpm", "#!/bin/sh\nexit 0\n");

    assert.equal(withPath(dir, detectPackageManager), "pnpm", "the exit status decides, not whether a version was printed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a probe that dies moves to the next package manager", () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-preflight-dead-"));

  try {
    scratchBin(dir, "pnpm", "#!/bin/sh\nexit 1\n");
    scratchBin(dir, "npm", "#!/bin/sh\necho 10.9.0\n");

    assert.equal(withPath(dir, detectPackageManager), "npm", "a failed probe is not an answer");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
