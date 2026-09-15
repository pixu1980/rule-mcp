

/**
 * Docker mode contract: the client config and the container share one SSE token.
 *
 * The compose file requires the token from the caller's environment, and the
 * installer is what puts it there. That used to be shell in `install.sh` and
 * PowerShell in `install.ps1`; it is `cli/setup/_docker.js` now (ADR 090), so
 * the contract is asserted against the compose file and that module.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { dockerBlockers, dockerComposeUp, sseTokenPath } from "../../cli/setup/_docker.js";

test("compose takes the token from the environment and never hardcodes one", () => {
  const compose = readFileSync("docker-compose.yml", "utf8");

  assert.match(compose, /RULE_MCP_SSE_TOKEN:/, "Compose must pass the daemon token into the container");
  assert.match(compose, /\$\{RULE_MCP_SSE_TOKEN/, "Compose must require the caller-provided token");
});

test("the installer looks for the token where the daemon writes it", () => {
  assert.match(sseTokenPath(), /state[/\\]sse-token$/, `the token path must be the daemon's: ${sseTokenPath()}`);
});

test("a missing precondition is named, one reason at a time", () => {
  const cwd = mkdtempSync(join(tmpdir(), "rule-docker-"));

  try {
    // No compose file here, so that is the blocker reported - not a single
    // "docker mode failed" standing in for four different causes.
    const blocker = dockerBlockers({ cwd });

    assert.match(blocker, /docker-compose\.yml not found|Docker Compose v2 is required/, blocker);
    assert.deepEqual(dockerComposeUp({ cwd }), { status: "blocked", reason: blocker });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("a dry run starts nothing", () => {
  const cwd = mkdtempSync(join(tmpdir(), "rule-docker-"));

  writeFileSync(join(cwd, "docker-compose.yml"), "services: {}\n");

  try {
    const result = dockerComposeUp({ cwd, dryRun: true });

    assert.ok(["planned", "blocked"].includes(result.status), JSON.stringify(result));
    assert.notEqual(result.status, "started", "a preview must not bring a container up");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
