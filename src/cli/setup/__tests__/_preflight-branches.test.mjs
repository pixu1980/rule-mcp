

/**
 * Branch coverage for preflight: the node floor's failure arm and the working
 * shim's two rows.
 *
 * The node floor is read from the running process, so the failure arm is
 * exercised by presenting the runtime the version it would have below 20. The
 * shim arms are driven by a scratch directory on PATH: nothing here writes to
 * the machine's real shim.
 */
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { preflight } from "../_preflight.js";
import { ownEntrypoint } from "../_shim.js";

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

/** An executable named `rule-mcp` in dir whose body is given. */
function fakeShim(dir, body) {
  const path = join(dir, "rule-mcp");

  mkdirSync(dir, { recursive: true });
  writeFileSync(path, body);
  chmodSync(path, 0o755);

  return path;
}

const check = (checks, id) => checks.find((entry) => entry.id === id);

test("a node below the floor fails the node check with the required version", () => {
  const descriptor = Object.getOwnPropertyDescriptor(process, "version");

  // The check reads `process.version`, so the only way to reach its failure
  // arm is to present the version such a runtime would report.
  Object.defineProperty(process, "version", { value: "v18.20.0", configurable: true, enumerable: true });

  try {
    const node = check(preflight().checks, "node");

    assert.equal(node.status, "fail");
    assert.match(node.detail, /18\.20\.0 - version 20 or newer is required/);
  } finally {
    Object.defineProperty(process, "version", descriptor);
  }
});

test("a working shim answers the binary and shim checks", { skip: process.platform === "win32" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-preflight-shim-"));

  try {
    const path = fakeShim(dir, `#!/bin/sh\n# ${ownEntrypoint()}\necho 9.9.9\n`);
    const { checks } = withEnv({ PATH: dir }, preflight);

    assert.equal(check(checks, "shim").status, "ok");
    assert.equal(check(checks, "shim").detail, path, "the shim row names the launcher it trusts");
    assert.equal(check(checks, "binary").status, "ok", "a trusted shim is a usable binary");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a working shim stands in for a checkout that has no local bin", { skip: process.platform === "win32" }, () => {
  const root = mkdtempSync(join(tmpdir(), "rule-mcp-preflight-elsewhere-"));
  const bin = join(root, "shim-bin");
  const saved = process.cwd();

  try {
    // The repo root override makes the checkout a directory with no bin/, so
    // the binary row has to fall back to the shim for its detail.
    const path = fakeShim(bin, `#!/bin/sh\n# ${join(root, "bin", "rule-mcp.js")}\necho 9.9.9\n`);
    process.chdir(root);

    const { checks } = withEnv({ PATH: bin, RULE_MCP_REPO_ROOT: root }, preflight);
    const binary = check(checks, "binary");

    assert.equal(binary.status, "ok");
    assert.equal(binary.detail, path, "the shim is named when there is no local bin");
  } finally {
    process.chdir(saved);
    rmSync(root, { recursive: true, force: true });
  }
});

test("a shim that launches something else warns instead of passing", { skip: process.platform === "win32" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-preflight-stale-"));

  try {
    const path = fakeShim(dir, "#!/bin/sh\necho 9.9.9\n");
    const shim = check(withEnv({ PATH: dir }, preflight).checks, "shim");

    assert.equal(shim.status, "warn", "present but untrusted is a warning, not a pass");
    assert.match(shim.detail, /present but does not launch/, `the detail says why: ${shim.detail}`);
    assert.ok(shim.detail.includes(path), "and names the launcher");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
