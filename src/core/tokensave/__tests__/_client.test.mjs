/**
 * @module test/tokensave/client
 *
 * Contract for the TokenSave CLI client: envelope parsing, argument mapping,
 * and the single unavailable result that callers branch on.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { callTool, isUnavailable, parseToolEnvelope, TokensaveUnavailableError } from "../_client.js";

test("parseToolEnvelope unwraps the MCP text envelope as JSON", () => {
  const parsed = parseToolEnvelope({ content: [{ type: "text", text: '{"node_count":3}' }] });

  assert.deepEqual(parsed, { node_count: 3 });
});

test("parseToolEnvelope returns raw text when the payload is not JSON", () => {
  const parsed = parseToolEnvelope({ content: [{ type: "text", text: "plain" }] });

  assert.equal(parsed, "plain");
});

test("parseToolEnvelope tolerates an empty envelope", () => {
  assert.equal(parseToolEnvelope({}), null);
});

test("callTool maps arguments to --json --args --project", async () => {
  const calls = [];
  const exec = async (file, args) => {
    calls.push({ file, args });

    return { stdout: JSON.stringify({ content: [{ type: "text", text: '{"ok":true}' }] }) };
  };
  const result = await callTool("status", { only: "x" }, { projectDir: "/tmp/p", exec });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { ok: true });
  assert.deepEqual(calls[0].args, ["tool", "status", "--json", "--args", '{"only":"x"}', "--project", "/tmp/p"]);
});

test("callTool returns the unavailable result when the binary is missing", async () => {
  const exec = async () => {
    const error = new Error("spawn tokensave ENOENT");

    error.code = "ENOENT";

    throw error;
  };
  const result = await callTool("status", {}, { exec });

  assert.equal(result.ok, false);
  assert.equal(result.unavailable, true);
  assert.equal(isUnavailable(result), true);
});

test("callTool reports a command failure as unavailable without throwing", async () => {
  const exec = async () => {
    const error = new Error("exit 1");

    error.stderr = "unknown tool";

    throw error;
  };
  const result = await callTool("nope", {}, { exec });

  assert.equal(result.ok, false);
  assert.equal(result.unavailable, true);
  assert.match(result.error, /unknown tool/);
});

test("TokensaveUnavailableError carries the reason", () => {
  const error = new TokensaveUnavailableError("no binary");

  assert.equal(error.name, "TokensaveUnavailableError");
  assert.equal(error.message, "no binary");
});
