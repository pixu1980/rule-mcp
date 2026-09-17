

/**
 * syncCommandTargets: one call covers every agent directory on the machine.
 *
 * HOME is redirected before the module loads, so every target this resolves
 * lands inside a scratch directory rather than the real agent configuration.
 */
import { strict as assert } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-sync-home-"));

process.env.HOME = home;

const { syncCommandTargets } = await import("../_targets-sync.js");
const { resolvedTargets } = await import("../_targets.js");

test.after(() => rmSync(home, { recursive: true, force: true }));

/** Run a command with stdout captured. */
function out(run) {
  const chunks = [];
  const write = process.stdout.write;

  process.stdout.write = (chunk) => {
    chunks.push(String(chunk));

    return true;
  };

  try {
    run();
  } finally {
    process.stdout.write = write;
  }

  return chunks.join("");
}

/** The directory the claude target resolves to inside the scratch home. */
const claudeDir = () => resolvedTargets({ agent: "claude" })[0].dir;

test("a machine with no agent directories is reported, not failed", () => {
  const text = out(() => syncCommandTargets({ agent: "nosuchagent" }));

  assert.match(text, /no agent command directories found/, "an empty resolution says so");
});

test("a dry run reports the files it would write and writes none", () => {
  const directory = claudeDir();
  const text = out(() => syncCommandTargets({ agent: "claude", dryRun: true }));

  assert.match(text, /wrote \d+ \w+ command file/, "it counts what it would write");
  assert.match(text, /synced \d+ file\(s\) across \d+ directory/, "and closes with the totals");
  assert.equal(existsSync(directory), false, "a dry run does not even create the directory");
});

test("a real sync writes the whole command set into the target", () => {
  const directory = claudeDir();

  out(() => syncCommandTargets({ agent: "claude" }));

  const written = readdirSync(directory);
  assert.ok(written.length > 0, "the command files land");
  assert.ok(
    written.every((name) => /^rule[-.]/.test(name)),
    `every file belongs to the rule namespace: ${written.join(", ")}`,
  );
  assert.ok(written.includes("rule-audit-security.md"), "a persona command is part of the set");
  assert.ok(written.includes("rule.md"), "so is the root routing command");
});

test("remove sweeps the whole rule namespace, including names the registry dropped", () => {
  const directory = claudeDir();

  out(() => syncCommandTargets({ agent: "claude" }));
  writeFileSync(join(directory, "rule-renamed-away.md"), "a command from an older release\n");
  writeFileSync(join(directory, "keep-me.md"), "not ours\n");

  const text = out(() => syncCommandTargets({ agent: "claude", remove: true }));

  assert.match(text, /removed \d+ rule\* command file/, "the removal reports its count");
  assert.deepEqual(readdirSync(directory), ["keep-me.md"], "every rule file goes, and nothing else does");
});

test("a dry-run remove reports what it would sweep and sweeps nothing", () => {
  const directory = claudeDir();

  out(() => syncCommandTargets({ agent: "claude" }));
  const before = readdirSync(directory).length;

  const text = out(() => syncCommandTargets({ agent: "claude", remove: true, dryRun: true }));

  assert.match(text, /\[dry-run] /, "the line is marked as a preview");
  assert.equal(readdirSync(directory).length, before, "the files are still there");
});

test("the target directory is created when it does not exist yet", () => {
  const directory = claudeDir();
  rmSync(directory, { recursive: true, force: true });

  out(() => syncCommandTargets({ agent: "claude" }));

  assert.ok(readdirSync(directory).length > 0, "the sync creates the directory it writes into");
});

test("every detected agent is covered by one call", () => {
  // Two agent homes exist now, so detection must reach both in a single sync.
  mkdirSync(join(home, ".codex"), { recursive: true });
  mkdirSync(join(home, ".claude"), { recursive: true });

  const text = out(() => syncCommandTargets({ dryRun: true }));
  const detected = resolvedTargets({});

  assert.match(text, new RegExp(`across ${detected.length} directory`), "the total matches what was resolved");
});

test("a comma-separated agent list writes every named agent", () => {
  // Regression: the install plan joins selected agents with commas, which used
  // to match no target at all - a two-agent install wrote zero command files.
  const claude = claudeDir();
  const pi = resolvedTargets({ agent: "pi" })[0].dir;
  rmSync(pi, { recursive: true, force: true });

  const text = out(() => syncCommandTargets({ agent: "claude,pi" }));

  assert.match(text, /across 2 directory/, "both named agents are covered in one call");
  assert.ok(readdirSync(claude).includes("rule.md"), "claude receives the router");
  assert.ok(readdirSync(pi).includes("rule.md"), "pi receives the router too");
  assert.ok(readdirSync(pi).includes("rule-audit-security.md"), "and the rest of the clean set");
});
