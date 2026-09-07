/** The JSON writer helpers: upsert/remove across agents and the VS Code variants. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { parseJson, removeJsonServer, removeVscodeServer, toJson, upsertJsonServer, upsertVscode, vscodeServerType } from "../_writers-json.js";

const SERVER = "rule-mcp";

test("parseJson parses or returns null", () => {
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
  assert.equal(parseJson("{ nope"), null);
});

test("upsertJsonServer creates the mcpServers block from an empty file", () => {
  const out = upsertJsonServer("", { command: "node", args: ["x"] });
  assert.match(out, new RegExp(SERVER), "the server entry appears");
  assert.match(out, /mcpServers/, "the mcpServers key is created");
});

test("upsertJsonServer merges new settings over the existing server entry", () => {
  const before = JSON.stringify({ mcpServers: { [SERVER]: { command: "old" } } }, null, 2);
  const out = upsertJsonServer(before, { command: "new", env: { K: "v" } });
  const parsed = parseJson(out);
  assert.equal(parsed.mcpServers[SERVER].command, "new", "new fields win");
  assert.equal(parsed.mcpServers[SERVER].env.K, "v", "extra fields carry");
});

test("upsertJsonServer refuses a malformed file", () => {
  assert.equal(upsertJsonServer("{ malformed", {}), null);
});

test("removeJsonServer removes the server and prunes an emptied file to empty", () => {
  const only = JSON.stringify({ mcpServers: { [SERVER]: { command: "x" } } });
  assert.equal(removeJsonServer(only), "", "an emptied file becomes empty");
});

test("removeJsonServer leaves other keys but drops the server", () => {
  const mixed = JSON.stringify({ mcpServers: { a: {}, [SERVER]: {} }, other: 1 });
  const out = parseJson(removeJsonServer(mixed));
  assert.equal(out.other, 1, "unrelated keys survive");
  assert.deepEqual(out.mcpServers.a, {}, "the other server survives");
});

test("removeJsonServer returns the original for an empty file", () => {
  assert.equal(removeJsonServer(""), "", "empty stays empty");
  assert.equal(removeJsonServer("  \n"), "  \n", "whitespace passes through");
  assert.equal(removeJsonServer("not json"), null, "malformed refuses");
});

test("vscodeServerType picks stdio, http and sse by url shape", () => {
  assert.equal(vscodeServerType({}), "stdio");
  assert.equal(vscodeServerType({ url: "http://localhost:3000/mcp" }), "http");
  assert.equal(vscodeServerType({ url: "http://localhost:3000/sse" }), "sse");
});

test("upsertVscode migrates the server into the servers block", () => {
  const legacy = JSON.stringify({ mcpServers: { [SERVER]: { command: "x" } } });
  const out = parseJson(upsertVscode(legacy, { url: "http://localhost:3000/mcp" }));
  assert.deepEqual(out.servers[SERVER], { url: "http://localhost:3000/mcp", type: "http" }, "the server lands in servers with a type");
  assert.equal(out.mcpServers, undefined, "the legacy copy is removed");
});

test("upsertVscode replaces an existing servers entry and prunes it on remove", () => {
  const existing = JSON.stringify({ servers: { [SERVER]: { type: "stdio" } } });
  const out = parseJson(upsertVscode(existing, { url: "https://h/mcp" }));
  assert.equal(out.servers[SERVER].type, "http", "the entry is replaced");

  const gone = removeVscodeServer(JSON.stringify({ servers: { [SERVER]: { type: "stdio" } } }));
  assert.equal(gone, "", "an emptied file becomes empty");
});

test("removeVscodeServer handles empty, malformed and mixed files", () => {
  assert.equal(removeVscodeServer(""), "", "empty passes through");
  assert.equal(removeVscodeServer("{ bad"), null, "malformed refuses");

  const mixed = JSON.stringify({ servers: { a: {}, [SERVER]: {} }, mcpServers: { [SERVER]: {}, b: {} }, keep: 1 });
  const out = parseJson(removeVscodeServer(mixed));
  assert.equal(out.keep, 1, "unrelated keys survive");
  assert.deepEqual(out.servers, { a: {} }, "the other server survives");
  assert.deepEqual(out.mcpServers, { b: {} }, "the other mcp server survives");
});