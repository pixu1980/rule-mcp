/** Branch coverage for validateAgentConfigs: vscode/claude/mcp.json arms. */
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { validateAgentConfigs } from "../_detect-agents.js";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-detect-agents-branches-"));

test.after(() => rmSync(home, { recursive: true, force: true }));

test("vscode reads servers.rule-mcp and nulls missing command fields", () => {
  const file = join(home, "vscode-mcp.json");
  writeFileSync(file, JSON.stringify({ servers: { "rule-mcp": { url: "http://127.0.0.1/mcp" } } }));

  const [agent] = validateAgentConfigs([{ name: "vscode", configured: true, configFile: file }]);

  assert.equal(agent.validated, true);
  assert.equal(agent.command, null, "a missing command is null, not undefined");
  assert.equal(agent.args, null);
  assert.equal(agent.url, "http://127.0.0.1/mcp");
});

test("vscode invalid JSON is reported, not thrown", () => {
  const file = join(home, "vscode-broken.json");
  writeFileSync(file, "{ not json");

  const [agent] = validateAgentConfigs([{ name: "vscode", configured: true, configFile: file }]);

  assert.equal(agent.validated, false);
  assert.equal(agent.parseError, "Invalid JSON");
});

test("claude .claude.json nulls a missing command on a present entry", () => {
  const file = join(home, ".claude.json");
  writeFileSync(file, JSON.stringify({ mcpServers: { "rule-mcp": { args: ["serve"] } } }));

  const [agent] = validateAgentConfigs([{ name: "claude", configured: true, configFile: file }]);

  assert.equal(agent.validated, true);
  assert.equal(agent.command, null);
  assert.deepEqual(agent.args, ["serve"]);
});

test("mcp.json nulls a missing command and rejects invalid JSON", () => {
  const ok = join(home, "ok", "mcp.json");
  mkdirSync(join(home, "ok"), { recursive: true });
  writeFileSync(ok, JSON.stringify({ mcpServers: { "rule-mcp": {} } }));

  const [good] = validateAgentConfigs([{ name: "cursor", configured: true, configFile: ok }]);

  assert.equal(good.validated, true);
  assert.equal(good.command, null);
  assert.equal(good.args, null);

  const broken = join(home, "broken", "mcp.json");
  mkdirSync(join(home, "broken"), { recursive: true });
  writeFileSync(broken, "[");

  const [bad] = validateAgentConfigs([{ name: "cursor", configured: true, configFile: broken }]);

  assert.equal(bad.validated, false);
  assert.equal(bad.parseError, "Invalid JSON");
});

test("an unreadable config file and a non-json config take their arms", { skip: process.platform === "win32" }, () => {
  const locked = join(home, "locked.json");
  writeFileSync(locked, "{}");
  chmodSync(locked, 0);

  try {
    const [unreadable] = validateAgentConfigs([{ name: "claude", configured: true, configFile: locked }]);

    assert.equal(unreadable.validated, false);
    assert.equal(unreadable.readError, "Cannot read file");
  } finally {
    chmodSync(locked, 0o644);
  }

  const plain = join(home, "notes.txt");
  writeFileSync(plain, "not a json agent config");

  const [other] = validateAgentConfigs([{ name: "windsurf", configured: true, configFile: plain }]);

  assert.equal(other.validated, true, "a non-json, non-special config is accepted as-is");
});
