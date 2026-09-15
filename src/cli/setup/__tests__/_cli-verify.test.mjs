

/**
 * The install's own proof: the CLI on PATH answers `--version`, `tools list`
 * and `doctor`, and any one of them failing is a broken install.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { verifyGlobalCli } from "../_cli-verify.js";

test("verifyGlobalCli reports a missing shim", () => {
  assert.equal(verifyGlobalCli({ skip: false, path: "" }).status, "missing");
});

test("verifyGlobalCli reports a shim that does not answer", () => {
  assert.equal(verifyGlobalCli({ skip: false, path: "/bin/rule", works: () => false }).status, "broken");
});

test("verifyGlobalCli reports a broken tools list", () => {
  const result = verifyGlobalCli({ skip: false, path: "/bin/rule", works: () => true, exec: () => "" });

  assert.equal(result.status, "broken");
  assert.match(result.reason, /tools list/);
});

test("verifyGlobalCli passes when the CLI answers", () => {
  const calls = [];
  const exec = (command) => {
    calls.push(command);

    return command.includes("tools") ? "107 tools" : "doctor ok";
  };
  const result = verifyGlobalCli({ skip: false, path: "/bin/rule", works: () => true, exec });

  assert.equal(result.status, "ok");
  assert.deepEqual(calls, ["rule-mcp tools list", "rule-mcp doctor"]);
});

test("verifyGlobalCli skips when the global link is disabled", () => {
  assert.equal(verifyGlobalCli({ skip: true }).status, "skipped");
});
