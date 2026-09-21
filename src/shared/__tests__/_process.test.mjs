

/**
 * SEC-6: a command that died and a command that printed nothing are two results.
 *
 * The string helper returns "" for both, so a caller cannot tell a killed
 * command from a silent one, and a caller that asked a question gets the same
 * answer either way. The result helper carries the exit status and names the
 * capture cap, which is the failure the string form reported as silence.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { tryExec, tryExecResult } from "../_process.js";

test("a command that printed nothing and exited zero is reported ok", () => {
  const result = tryExecResult("true");

  assert.equal(result.ok, true, "exit status zero is a success");
  assert.equal(result.stdout, "", "and it printed nothing");
  assert.equal(result.code, 0, "the exit code is zero");
  assert.equal(result.capped, false, "nothing was dropped");
});

test("a command that dies is not ok and keeps its exit code", () => {
  const result = tryExecResult("exit 3");

  assert.equal(result.ok, false, "a non-zero exit is a failure");
  assert.equal(result.code, 3, "the exit code survives the call");
  assert.equal(result.stdout, "", "and there is no output to report");
  assert.equal(result.capped, false, "nothing was dropped");
});

test("output past the capture limit is capped, not silence", () => {
  const result = tryExecResult("yes | head -c 2000000");

  assert.equal(result.ok, false, "the capture limit is a failure");
  assert.equal(result.capped, true, "and it is named as capped rather than empty");
});

test("the string helper keeps the contract its text-only callers rely on", () => {
  assert.equal(tryExec("printf hi"), "hi", "stdout is still returned as a string");
  assert.equal(tryExec("exit 3"), "", "and a failure is still the empty string");
});
