/** Regression: native daemon service is installed only for daemon mode. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";

const root = new URL("../..", import.meta.url).pathname;
const run = (mode) =>
  execFileSync("bash", ["scripts/install.sh", "--agent", "pi", "--mode", mode, "--dry-run", "--no-rules"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, TERM: "dumb" },
  });

const stdio = run("stdio");
assert.doesNotMatch(stdio, /Would install daemon service/, "stdio mode must not install a background daemon");

const daemon = run("daemon");
assert.match(daemon, /Would install daemon service/, "daemon mode must install its background service");

const docker = run("docker");
assert.doesNotMatch(docker, /Would install daemon service/, "docker mode must not install a native daemon");
assert.match(docker, /docker compose up -d/, "docker mode must start Compose");

console.log("  ✅ shell installer installs native daemon only in daemon mode");
