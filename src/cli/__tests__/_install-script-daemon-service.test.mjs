

/**
 * Regression: the native daemon service belongs to daemon mode alone.
 *
 * stdio starts a process per session and docker runs the service in a
 * container; registering a LaunchAgent or a systemd unit for either would
 * leave a second server running behind the user's back.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../..", import.meta.url));

const run = (mode) => {
  const home = mkdtempSync(join(tmpdir(), `rule-daemon-svc-${mode}-`));

  return execFileSync("bash", ["scripts/install.sh", "--agent", "pi", "--mode", mode, "--dry-run", "--no-rules"], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      PNPM_HOME: join(home, ".pnpm"),
      RULE_MCP_HOME: join(home, ".rule-mcp"),
      RULE_MCP_SKIP_GLOBAL_LINK: "1",
      TERM: "dumb",
    },
  });
};

test("stdio mode installs no background service", () => {
  assert.doesNotMatch(run("stdio"), /Platform daemon service/);
});

test("daemon mode installs the platform service", () => {
  assert.match(run("daemon"), /Platform daemon service/);
});

test("docker mode starts Compose and installs no native service", () => {
  const output = run("docker");

  assert.doesNotMatch(output, /Platform daemon service/, "the container is the service");
  assert.match(output, /Docker SSE service/, "docker mode must run the Compose step");
});
