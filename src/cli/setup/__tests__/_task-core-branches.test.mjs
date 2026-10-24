

/**
 * Branch coverage for the core install tasks: an unwritable shim directory, a
 * skipped shim with no path, a removal with nothing and with one entry to
 * count, a deprecated agent's redirect, a config that cannot be parsed, and
 * the real (not dry-run) install/remove summary lines.
 *
 * The home directory is a scratch directory created before the installer
 * modules are imported, because the installers resolve `HOME` once at load.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-task-core-branches-"));

process.env.HOME = home;
process.env.RULE_MCP_HOME = join(home, ".rule-mcp");
delete process.env.RULE_MCP_SKIP_GLOBAL_LINK;

const { agentInstallTask, agentRemovalTask, shimRemovalTask, shimTask } = await import("../_task-core.js");

test.after(() => rmSync(home, { recursive: true, force: true }));

/** Run fn with the given env overrides, restoring every touched key. */
function withEnv(overrides, fn) {
  const saved = {};

  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

/** An empty directory a shell can look in and find nothing. */
const emptyBin = join(home, "empty-bin");

mkdirSync(emptyBin, { recursive: true });

test("a real install reports configured, not would configure", () => {
  const result = agentInstallTask("claude", "stdio", true).run({ dryRun: false });

  assert.equal(result.status, "ok");
  assert.equal(result.summary, "configured");
});

test("a deprecated agent lands under its successor and carries the warning", () => {
  const result = agentInstallTask("windsurf", "stdio", false).run({ dryRun: true });

  assert.equal(result.status, "ok");
  assert.match(result.summary, /would configure/);
  assert.match(result.summary, /"windsurf" is deprecated - use "devin" instead/, "the redirect is named in the row");
});

test("a deprecated agent removal does not read a row under its old name", () => {
  const result = agentRemovalTask("windsurf").run({ dryRun: true });

  assert.equal(result.status, "ok", "the successor's row answers for it");
  assert.equal(result.summary, "would remove");
});

test("a config that cannot be parsed is a warning row", () => {
  const dir = join(home, ".gemini");

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "settings.json"), "{ not json");

  try {
    const result = agentRemovalTask("gemini").run({ dryRun: true });

    assert.equal(result.status, "warn", "the run continues and the row carries the reason");
    assert.match(result.summary, /parse error/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a real removal reports removed", () => {
  const result = agentRemovalTask("claude", { commands: true }).run({ dryRun: false });

  assert.equal(result.status, "ok");
  assert.equal(result.summary, "removed");
});

test("a shim directory that cannot be created is a warning, not a throw", () => {
  const blocker = join(home, "not-a-directory");

  writeFileSync(blocker, "");

  // PNPM_HOME names the directory's parent; a file there makes mkdir fail.
  const result = withEnv({ PATH: emptyBin, PNPM_HOME: blocker }, () => shimTask("/x/bin.js").run({ dryRun: false }));

  assert.equal(result.status, "warn");
  assert.match(result.summary, /^unwritable/);
});

test("a skipped shim with no stale path reports no path", () => {
  const result = withEnv({ PATH: emptyBin, PNPM_HOME: undefined, RULE_MCP_SKIP_GLOBAL_LINK: "1" }, () => shimTask("/x/bin.js").run({ dryRun: false }));

  assert.equal(result.status, "ok");
  assert.equal(result.summary, "skipped - RULE_MCP_SKIP_GLOBAL_LINK=1", "the reason is the whole line when there is no path");
});

test("a sandboxed removal says skipped, not an entry removed", () => {
  const result = withEnv({ RULE_MCP_SKIP_GLOBAL_LINK: "1" }, () => shimRemovalTask().run({ dryRun: true }));

  assert.equal(result.status, "ok");
  assert.equal(result.summary, "skipped", "the skipped row is not counted as removed");
  assert.equal(result.lines.length, 1);
});

test("nothing to remove reads as nothing found", () => {
  const result = withEnv({ PNPM_HOME: undefined }, () => shimRemovalTask().run({ dryRun: true }));

  assert.equal(result.summary, "nothing found");
  assert.deepEqual(result.lines, []);
});

test("one shim is one entry, two shims are entries", () => {
  const one = join(home, ".pnpm-global", "bin");

  mkdirSync(one, { recursive: true });
  writeFileSync(join(one, "rule-mcp"), "# shim\n");

  const single = withEnv({ PNPM_HOME: undefined }, () => shimRemovalTask().run({ dryRun: true }));

  assert.equal(single.summary, "1 entry");

  const two = join(home, ".npm-global", "bin");

  mkdirSync(two, { recursive: true });
  writeFileSync(join(two, "rule-mcp"), "# shim\n");

  const plural = withEnv({ PNPM_HOME: undefined }, () => shimRemovalTask().run({ dryRun: true }));

  assert.equal(plural.summary, "2 entries");
  assert.equal(plural.lines.length, 2);

  rmSync(join(home, ".pnpm-global"), { recursive: true, force: true });
  rmSync(join(home, ".npm-global"), { recursive: true, force: true });
});
