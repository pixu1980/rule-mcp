

/** opencode's JSON dialect: the mcp block, the command array, the instruction list. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { parseJson, toJson } from "../_writers-json.js";
import { removeOpencode, upsertOpencode } from "../_writers-opencode.js";

const SERVER = "rule-mcp";

test("upsertOpencode creates the mcp block in opencode's own shape", () => {
  const out = parseJson(upsertOpencode("", { command: "node", args: ["x.js", "serve"], env: { K: "v" } }, "/tmp/instructions.md"));
  assert.equal(out.$schema, "https://opencode.ai/config.json", "a created file carries the schema first");
  assert.deepEqual(out.mcp[SERVER], { type: "local", command: ["node", "x.js", "serve"], enabled: true, environment: { K: "v" } });
  assert.deepEqual(out.instructions, ["/tmp/instructions.md"], "the instruction file is registered");
});

test("upsertOpencode joins command and args into the command array, without an args key", () => {
  const out = parseJson(upsertOpencode("", { command: "/bin/rule", args: ["serve"], type: "stdio" }));
  assert.deepEqual(out.mcp[SERVER].command, ["/bin/rule", "serve"]);
  assert.equal(out.mcp[SERVER].args, undefined, "opencode has no separate args key");
  assert.equal(out.mcp[SERVER].type, "local", "the mcpServers type is replaced by opencode's");
});

test("upsertOpencode migrates a stale mcpServers entry and keeps the user's options", () => {
  const before = toJson({
    mcp: { [SERVER]: { type: "local", command: "/old/bin", args: ["serve"], env: { OLD: "1" }, enabled: false, timeout: 9000, cwd: "/tmp" } },
  });
  const out = parseJson(upsertOpencode(before, { command: "/new/bin", args: ["serve"], env: { K: "v" } }));

  assert.deepEqual(out.mcp[SERVER], {
    type: "local",
    command: ["/new/bin", "serve"],
    environment: { K: "v" },
    enabled: false,
    timeout: 9000,
    cwd: "/tmp",
  });
  assert.equal(out.mcp[SERVER].args, undefined, "the stale args key is dropped - opencode rejects unknown keys");
  assert.equal(out.mcp[SERVER].env, undefined, "and the mcpServers env alias with it");
});

test("upsertOpencode keeps oauth and timeout on a remote entry", () => {
  const before = toJson({ mcp: { [SERVER]: { type: "remote", url: "old", oauth: false, enabled: true, timeout: 1000 } } });
  const out = parseJson(upsertOpencode(before, { url: "http://127.0.0.1:3737/sse", headers: { Authorization: "Bearer t" } }));

  assert.deepEqual(out.mcp[SERVER], {
    type: "remote",
    url: "http://127.0.0.1:3737/sse",
    headers: { Authorization: "Bearer t" },
    enabled: true,
    timeout: 1000,
    oauth: false,
  });
});

test("upsertOpencode maps a url config to a remote server with headers", () => {
  const out = parseJson(upsertOpencode("", { url: "http://127.0.0.1:3737/sse", headers: { Authorization: "Bearer t" } }));
  assert.deepEqual(out.mcp[SERVER], { type: "remote", url: "http://127.0.0.1:3737/sse", enabled: true, headers: { Authorization: "Bearer t" } });
  assert.equal(out.instructions, undefined, "no instruction path outside the insert");
});

test("upsertOpencode preserves user keys and never duplicates the instruction path", () => {
  const before = toJson({ instructions: ["/home/u/tokensave.md"], mcp: { other: { type: "local", command: ["a"] } }, model: "x/y" });
  const once = upsertOpencode(before, { command: "node", args: ["serve"] }, "/tmp/instructions.md");
  const out = parseJson(once);
  assert.equal(out.model, "x/y", "unrelated keys survive");
  assert.deepEqual(out.mcp.other, { type: "local", command: ["a"] }, "the user's own server survives");
  assert.deepEqual(out.instructions, ["/home/u/tokensave.md", "/tmp/instructions.md"], "the path follows the user's entries");

  const again = parseJson(upsertOpencode(once, { command: "node", args: ["serve"] }, "/tmp/instructions.md"));
  assert.equal(again.instructions.filter((entry) => entry === "/tmp/instructions.md").length, 1, "a second install never duplicates it");
});

test("upsertOpencode refuses a malformed file", () => {
  assert.equal(upsertOpencode("{ malformed", {}), null);
});

test("removeOpencode drops the server and its instruction path", () => {
  const before = toJson({ $schema: "https://opencode.ai/config.json", mcp: { [SERVER]: {}, other: {} }, instructions: ["/tmp/instructions.md", "/home/u/tokensave.md"] });
  const out = parseJson(removeOpencode(before, "/tmp/instructions.md"));
  assert.deepEqual(out.mcp, { other: {} }, "the other server survives");
  assert.deepEqual(out.instructions, ["/home/u/tokensave.md"], "the user's instruction survives");
});

test("removeOpencode prunes the blocks it emptied", () => {
  const only = toJson({ mcp: { [SERVER]: {} }, instructions: ["/tmp/instructions.md"] });
  assert.equal(removeOpencode(only, "/tmp/instructions.md"), "", "a file we filled alone empties");
});

test("removeOpencode handles empty and malformed files", () => {
  assert.equal(removeOpencode(""), "", "empty stays empty");
  assert.equal(removeOpencode("not json", "/tmp/x.md"), null, "malformed refuses");
});
