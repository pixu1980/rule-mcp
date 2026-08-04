// test/docker-hardening.test.mjs
//
// Audit finding 07 — the container image and its compose file contradicted the
// loopback-only posture the rest of the server is built around:
//
//   * `ports: "37999:37999"` publishes on the host's 0.0.0.0, so the
//     container's deliberate RULE_MCP_HOST=0.0.0.0 became LAN exposure
//     with a bearer token as the only barrier and no lockout on failed auth.
//   * the image ran as root (node:*-alpine's default), so anything the server
//     wrote inside the container was written as root.
//   * dependency install scripts ran at build time.
//
// These assertions are on the shipped files: a compose port mapping is exactly
// the kind of one-line regression nobody notices in review.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const compose = readFileSync("docker-compose.yml", "utf8");
const dockerfile = readFileSync("Dockerfile", "utf8");

test("compose publishes the MCP port on loopback only", () => {
  const mappings = [...compose.matchAll(/^\s*-\s*"([^"]*:)?(\d+):(\d+)"/gm)];
  assert.ok(mappings.length > 0, "the compose file must publish a port");
  for (const [, host] of mappings) {
    assert.ok(host, `port mapping without a host address publishes on 0.0.0.0: ${host}`);
    assert.match(host, /^(127\.0\.0\.1|\[::1\]|localhost):$/, "published ports must bind loopback");
  }
});

test("compose still requires the caller-provided bearer token", () => {
  // Regression guard: loopback binding is not a reason to drop auth.
  assert.match(compose, /\$\{RULE_MCP_SSE_TOKEN/);
});

test("the image drops root before running the server", () => {
  const userDirectives = [...dockerfile.matchAll(/^USER\s+(\S+)/gm)].map(([, user]) => user);
  assert.ok(userDirectives.length > 0, "the Dockerfile must set a USER");
  assert.notEqual(userDirectives.at(-1), "root", "the final USER must not be root");
  const userIndex = dockerfile.lastIndexOf("USER ");
  const cmdIndex = dockerfile.lastIndexOf("CMD ");
  assert.ok(userIndex < cmdIndex, "USER must come before CMD, or the drop does not apply to the server");
});

test("dependency install does not run package scripts", () => {
  const installLine = dockerfile.split("\n").find((line) => line.includes("pnpm install"));
  assert.ok(installLine, "the Dockerfile must install dependencies");
  assert.match(installLine, /--ignore-scripts/, "a dependency postinstall must not run at build time");
});

test("the container is told it is a container", () => {
  // detectInstallType() uses this to refuse git self-update inside an image.
  assert.match(dockerfile, /RULE_MCP_DOCKER=1/);
});
