

/** Branch coverage for Docker blockers and compose-up outcomes. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const state = mkdtempSync(join(tmpdir(), "rule-mcp-docker-state-"));
process.env.RULE_MCP_STATE_DIR = state;

const { dockerBlockers, dockerComposeUp, sseTokenPath } = await import("../_docker.js");

test("a project without compose is blocked", () => {
  const cwd = mkdtempSync(join(tmpdir(), "rule-mcp-docker-branches-"));
  const reason = dockerBlockers({ cwd });

  assert.match(reason, /docker-compose\.yml not found|Docker Compose/u);
});

test("a dry run with every precondition met is planned", () => {
  const cwd = mkdtempSync(join(tmpdir(), "rule-mcp-docker-branches-"));

  writeFileSync(join(cwd, "docker-compose.yml"), "services: {}\n");
  mkdirSync(join(sseTokenPath(), ".."), { recursive: true });
  writeFileSync(sseTokenPath(), "tok\n");

  const blockers = dockerBlockers({ cwd });

  if (blockers) {
    assert.match(blockers, /Docker Compose/u, "without Docker the first blocker wins");

    return;
  }

  assert.deepEqual(dockerComposeUp({ cwd, dryRun: true }), { status: "planned" });
});

test("compose-up without a token is blocked before the shell", () => {
  const cwd = mkdtempSync(join(tmpdir(), "rule-mcp-docker-branches-"));

  writeFileSync(join(cwd, "docker-compose.yml"), "services: {}\n");

  const result = dockerComposeUp({ cwd, dryRun: false });

  assert.equal(result.status, "blocked");
  assert.ok(result.reason);
});
