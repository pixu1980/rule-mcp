

/**
 * Branch coverage for runSetup: blocked preflight, plain dry-run, uninstall,
 * settleExit on failures, wizard runtime notes, and the interactive mount path.
 *
 * The Ink apps are stubbed through registerHooks so a TTY is never required.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-setup-index-home-"));
const stateDir = join(home, ".rule-mcp", "state");

mkdirSync(stateDir, { recursive: true });
process.env.HOME = home;
process.env.RULE_MCP_HOME = join(home, ".rule-mcp");
process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.CI;

const stubPlainUrl = pathToFileURL(join(import.meta.dirname, "_setup-plain.stub.mjs")).href;
const stubMountUrl = pathToFileURL(join(import.meta.dirname, "_setup-mount.stub.mjs")).href;
const stubAppInstallUrl = pathToFileURL(join(import.meta.dirname, "_setup-app-install.stub.mjs")).href;
const stubAppUninstallUrl = pathToFileURL(join(import.meta.dirname, "_setup-app-uninstall.stub.mjs")).href;

let plainMode = "ok";
let mountCalls = 0;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./_plain.js" && context.parentURL?.includes("/cli/setup/index.js")) {
      return { url: stubPlainUrl, shortCircuit: true };
    }

    if (specifier === "./_mount.js" && context.parentURL?.includes("/cli/setup/index.js")) {
      return { url: stubMountUrl, shortCircuit: true };
    }

    if (specifier === "./_app-install.js" && context.parentURL?.includes("/cli/setup/index.js")) {
      return { url: stubAppInstallUrl, shortCircuit: true };
    }

    if (specifier === "./_app-uninstall.js" && context.parentURL?.includes("/cli/setup/index.js")) {
      return { url: stubAppUninstallUrl, shortCircuit: true };
    }

    return nextResolve(specifier, context);
  },
});

// Stubs read these through the shared control object exported below.
Object.defineProperty(globalThis, "__pixSetupBranches", {
  configurable: true,
  value: {
    get plainMode() {
      return plainMode;
    },
    set plainMode(value) {
      plainMode = value;
    },
    bumpMount() {
      mountCalls += 1;
    },
    get mountCalls() {
      return mountCalls;
    },
  },
});

const { runSetup } = await import("../index.js");

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  process.exitCode = undefined;
});

test("a blocked preflight exits before the plan runs", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(process, "version");

  Object.defineProperty(process, "version", { value: "v18.20.0", configurable: true, enumerable: true });
  process.exitCode = undefined;

  const stderr = [];
  const write = process.stderr.write.bind(process.stderr);

  process.stderr.write = (chunk, ...rest) => {
    stderr.push(String(chunk));

    return write(chunk, ...rest);
  };

  try {
    await runSetup({ interactive: false, dryRun: true });
    assert.equal(process.exitCode, 1);
    assert.match(stderr.join(""), /Preflight failed/u);
  } finally {
    process.stderr.write = write;
    Object.defineProperty(process, "version", descriptor);
    process.exitCode = undefined;
  }
});

test("a non-interactive dry-run install settles a failure count", async () => {
  plainMode = "fail";
  process.exitCode = undefined;

  await runSetup({ interactive: false, dryRun: true, agent: "claude", rules: false, commands: false, hooks: false, doctor: false, skills: false });

  assert.equal(process.exitCode, 1);
  process.exitCode = undefined;
  plainMode = "ok";
});

test("agents nullish falls through to detection on a plain install", async () => {
  plainMode = "ok";
  process.exitCode = undefined;

  await runSetup({ interactive: false, dryRun: true, rules: false, commands: false, hooks: false, doctor: false, skills: false });

  assert.notEqual(process.exitCode, 1);
});

test("uninstall plain path runs without installing", async () => {
  plainMode = "ok";
  process.exitCode = undefined;

  await runSetup({ uninstall: true, interactive: false, dryRun: true });

  assert.notEqual(process.exitCode, 1);
});

test("interactive install mounts the wizard and settles failures", async () => {
  const before = mountCalls;
  const descriptor = Object.getOwnPropertyDescriptor(process, "version");

  // Force canRenderWizard so interactive stays true even if stdin is a pipe.
  Object.defineProperty(process, "version", { value: "v24.0.0", configurable: true, enumerable: true });
  Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
  delete process.env.CI;
  process.env.TERM = "xterm";
  plainMode = "fail";
  process.exitCode = undefined;

  try {
    await runSetup({ interactive: true, dryRun: true });
    assert.equal(mountCalls, before + 1);
    assert.equal(process.exitCode, 1);
  } finally {
    Object.defineProperty(process, "version", descriptor);
    process.exitCode = undefined;
    plainMode = "ok";
  }
});

test("interactive uninstall mounts the uninstall wizard", async () => {
  const before = mountCalls;
  const descriptor = Object.getOwnPropertyDescriptor(process, "version");

  Object.defineProperty(process, "version", { value: "v24.0.0", configurable: true, enumerable: true });
  Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
  process.env.TERM = "xterm";
  process.exitCode = undefined;

  try {
    await runSetup({ uninstall: true, interactive: true, dryRun: true });
    assert.equal(mountCalls, before + 1);
  } finally {
    Object.defineProperty(process, "version", descriptor);
    process.exitCode = undefined;
  }
});

test("a wizard runtime note prints when the renderer floor is not met", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(process, "version");
  const stdout = [];
  const write = process.stdout.write.bind(process.stdout);

  Object.defineProperty(process, "version", { value: "v20.11.0", configurable: true, enumerable: true });
  process.stdout.write = (chunk, ...rest) => {
    stdout.push(String(chunk));

    return write(chunk, ...rest);
  };
  plainMode = "ok";

  try {
    // interactive omitted (not false): the note is allowed to print.
    await runSetup({ dryRun: true, rules: false, commands: false, hooks: false, doctor: false, skills: false });
    assert.match(stdout.join(""), /cannot host the wizard/u);
  } finally {
    process.stdout.write = write;
    Object.defineProperty(process, "version", descriptor);
  }
});

test("interactive false suppresses the wizard runtime note", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(process, "version");
  const stdout = [];
  const write = process.stdout.write.bind(process.stdout);

  Object.defineProperty(process, "version", { value: "v20.11.0", configurable: true, enumerable: true });
  process.stdout.write = (chunk, ...rest) => {
    stdout.push(String(chunk));

    return write(chunk, ...rest);
  };
  plainMode = "ok";

  try {
    await runSetup({ interactive: false, dryRun: true, rules: false, commands: false, hooks: false, doctor: false, skills: false });
    assert.doesNotMatch(stdout.join(""), /cannot host the wizard/u);
  } finally {
    process.stdout.write = write;
    Object.defineProperty(process, "version", descriptor);
  }
});
