

/**
 * Which agent may be written in which mode, and what a deprecated name does.
 *
 * Both are decided before a byte is written, so both are tested here rather
 * than through a home directory: a remote mode that is only verified for two
 * agents must refuse the rest, and `--force` must downgrade that refusal to a
 * warning without hiding which choice is the supported one.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { checkRemoteSupport, installAgent, remoteModeAgents, uninstallAgent } from "../_agent-ops.js";

test("stdio is supported everywhere, so it raises nothing", () => {
  assert.equal(checkRemoteSupport("claude", "stdio"), null);
  assert.equal(checkRemoteSupport("not-an-agent", "stdio", true), null, "not even for a name nobody ships");
});

test("an agent that speaks a remote mode raises nothing either", () => {
  const [verified] = [...remoteModeAgents];

  assert.ok(verified, "the catalog names at least one verified agent");
  assert.equal(checkRemoteSupport(verified, "daemon"), null);
});

test("a remote mode on an unverified agent is an error, naming the agent and the mode", () => {
  const support = checkRemoteSupport("claude", "daemon");

  assert.ok(support?.error, "it refuses");
  assert.match(support.error, /daemon/, "the mode is named");
  assert.match(support.error, /claude/, "so is the agent");
  assert.equal(support.warning, undefined, "an error is not also a warning");
});

test("force turns the refusal into a warning that still names the safe choice", () => {
  const support = checkRemoteSupport("claude", "docker", true);

  assert.equal(support?.error, undefined, "forced means written");
  assert.match(support.warning, /docker/);
  assert.match(support.warning, /stdio stays the supported choice/, "the warning does not pretend the mode is verified");
});

test("an unsupported agent name is refused before any mode question", () => {
  assert.throws(() => installAgent({ agent: "not-an-agent", entrypoint: "/x", dryRun: true }), /Unsupported agent: "not-an-agent"/);
  assert.throws(() => uninstallAgent({ agent: "not-an-agent", dryRun: true }), /Unsupported agent: "not-an-agent"/);
});

test("a dry run reports the mode it would have used and writes no manifest", () => {
  const result = installAgent({ agent: "claude", entrypoint: "/x/bin.js", dryRun: true });

  assert.equal(result.dryRun, true);
  assert.equal(result.mode, "stdio");
  assert.equal(result.manifest, undefined, "a dry run leaves no manifest behind");
  assert.ok("claude" in result.installed, "the agent is reported either way");
});

test("a deprecated name still installs, under its successor, with a warning", () => {
  const result = installAgent({ agent: "windsurf", entrypoint: "/x/bin.js", dryRun: true });

  assert.ok(
    result.warnings?.some((text) => text.includes("windsurf")),
    `the deprecated name is called out: ${JSON.stringify(result.warnings)}`,
  );
  assert.ok(!("windsurf" in result.installed), "the deprecated key is not what gets written");
});

test("a deprecated name uninstalls under its successor too", () => {
  const result = uninstallAgent({ agent: "windsurf", dryRun: true });

  assert.equal(result.ok, true);
  assert.ok(result.warnings?.some((text) => text.includes("windsurf")));
});

test("a refused mode is reported per agent rather than thrown", () => {
  const result = installAgent({ agent: "claude", entrypoint: "/x/bin.js", dryRun: true, mode: "daemon" });

  assert.equal(result.ok, false, "the run is not ok");
  assert.match(result.installed.claude.error, /supported only for Pi and VS Code/);
});

test("all sweeps the live catalog, and names no deprecated agent in it", () => {
  const result = installAgent({ agent: "all", entrypoint: "/x/bin.js", dryRun: true });

  assert.ok(Object.keys(result.installed).length > 1, "more than one agent was visited");
  assert.equal(result.warnings, undefined, "a catalog sweep has nothing deprecated to warn about");
  assert.ok(!("windsurf" in result.installed), "a deprecated name is not swept");
});

test("all sweeps the catalog on the way out too", () => {
  const result = uninstallAgent({ agent: "all", dryRun: true });

  assert.equal(result.ok, true);
  assert.ok(Object.keys(result.uninstalled).length > 1);
  assert.equal(result.warnings, undefined);
});

test("a remote mode refused for one agent does not stop the sweep", () => {
  const result = installAgent({ agent: "all", entrypoint: "/x/bin.js", dryRun: true, mode: "daemon" });
  const entries = Object.values(result.installed);

  assert.ok(
    entries.some((entry) => entry.error),
    "the unverified agents are refused",
  );
  assert.ok(
    entries.some((entry) => !entry.error),
    "and the verified ones are still written",
  );
});

test("forcing a remote mode across the catalog warns once per agent it had to force", () => {
  const result = installAgent({ agent: "all", entrypoint: "/x/bin.js", dryRun: true, mode: "daemon", force: true });

  assert.ok(result.warnings?.length > 0, "every forced agent says so");
  assert.ok(
    result.warnings.every((text) => text.includes("stdio stays the supported choice")),
    "and none of them pretends the mode is verified",
  );
});
