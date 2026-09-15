

/**
 * The runtime home is created by an install and taken by a purge.
 *
 * Regression: `uninstall --purge` removed `~/.config/rule-mcp/` and left
 * `~/.rule-mcp/` - the daemon token, the telemetry, the caches and the
 * per-project recordings - behind. Reinstalling then started from stale state,
 * and the promise the word "purge" makes was silently broken.
 *
 * This was a static contract over four shell scripts. They are bootstraps now
 * (ADR 080): the layout and the purge list are node, and so is the assertion.
 *
 * Every case runs in a child process with its own HOME. The config directory
 * is resolved once, when `cli/installers/_env.js` is imported, so a test that
 * swapped HOME in-process would write the switches into the real one.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const runtimeHome = join(here, "..", "..", "setup", "_runtime-home.js");
// The module reaches server code through `@src/*`, which only resolves with
// the hook every entry point registers.
const aliasHook = join(here, "..", "..", "..", "..", "scripts", "alias-hook.mjs");

/** Evaluate one expression over the module in a child process with this HOME. */
function inHome(home, call) {
  const source = `
    const { ensureRuntimeHome, purgeTargets } = await import(${JSON.stringify(runtimeHome)});
    process.stdout.write(JSON.stringify(${call}));
  `;

  return JSON.parse(
    execFileSync(process.execPath, ["--import", aliasHook, "--input-type=module", "-e", source], {
      encoding: "utf8",
      env: { ...process.env, HOME: home, RULE_MCP_HOME: "", RULE_MCP_STATE_DIR: "" },
    }),
  );
}

/** A fake HOME carrying both directories a purge is expected to take. */
function seeded() {
  const home = mkdtempSync(join(tmpdir(), "rule-purge-home-"));

  for (const dir of ["state", "projects", "data", "config"]) {
    mkdirSync(join(home, ".rule-mcp", dir), { recursive: true });
  }

  writeFileSync(join(home, ".rule-mcp", "state", "sse-token"), "test-token\n");
  mkdirSync(join(home, ".config", "rule-mcp"), { recursive: true });
  writeFileSync(join(home, ".config", "rule-mcp", "keys.json"), "{}");

  return home;
}

test("an install recreates the whole layout, not just the directory", () => {
  const home = mkdtempSync(join(tmpdir(), "rule-home-"));

  try {
    const result = inHome(home, "ensureRuntimeHome({})");

    for (const dir of ["state", "data", "projects", "config"]) {
      assert.ok(existsSync(join(home, ".rule-mcp", dir)), `${dir}/ must exist after an install`);
    }

    assert.equal(result.homeDir, join(home, ".rule-mcp"));
    assert.equal(result.settings, "written", "a fresh install defaults the switches file");
    assert.ok(existsSync(join(home, ".config", "rule-mcp", "env.json")), "the switches file is part of the install");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a dry run creates nothing", () => {
  const home = mkdtempSync(join(tmpdir(), "rule-home-"));

  try {
    inHome(home, "ensureRuntimeHome({ dryRun: true })");

    assert.ok(!existsSync(join(home, ".rule-mcp")), "a preview must leave the machine as it found it");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a purge names the runtime home, the cache and the configuration", () => {
  const home = seeded();

  try {
    const targets = inHome(home, "purgeTargets()");
    const dirs = targets.map((target) => target.dir);

    assert.ok(dirs.includes(join(home, ".rule-mcp")), `the runtime home must be purged: ${dirs.join(", ")}`);
    assert.ok(dirs.includes(join(home, ".config", "rule-mcp")), `the configuration must be purged: ${dirs.join(", ")}`);
    assert.ok(
      targets.some((target) => target.id === "runtime-home" && target.files > 0),
      "a purge counts what it will take, so the user can see it",
    );

    assert.deepEqual(targets.map((target) => target.id).sort(), ["compile-cache", "env-config", "runtime-home"], "three directories, and a purge takes all of them");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
