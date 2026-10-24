import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.RULE_MCP_HOME = mkdtempSync(join(tmpdir(), "rule-mcp-manifest-"));

const { forgetInstall, hasManifest, manifestPath, readManifest, recordInstall } = await import("../_manifest.js");

test("an empty manifest is readable before any install", () => {
  assert.equal(hasManifest(), false);
  assert.deepEqual(readManifest().agents, []);
});

test("recordInstall merges agents and keeps the last mode", () => {
  recordInstall({ agent: "claude" });
  recordInstall({ agent: "codex", mode: "daemon" });

  const manifest = readManifest();

  assert.deepEqual(manifest.agents, ["claude", "codex"]);
  assert.equal(manifest.mode, "daemon");
  assert.ok(manifest.installedAt);
  assert.ok(manifestPath().endsWith("install.json"));
});

test("a dry run records nothing", () => {
  recordInstall({ agent: "cursor", dryRun: true });

  assert.equal(readManifest().agents.includes("cursor"), false);
});

test("forgetInstall removes one agent and deletes the file at zero", () => {
  forgetInstall({ agent: "claude" });
  assert.deepEqual(readManifest().agents, ["codex"]);

  forgetInstall({ agent: "codex" });
  assert.equal(hasManifest(), false);
});
