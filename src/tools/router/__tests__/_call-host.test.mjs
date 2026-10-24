

/**
 * ARCH-1: the pipeline reaches its hosts through the port, not by import.
 *
 * The port is what breaks the cycle, so it has to be the thing that actually
 * carries the kick and the banner - not a seam that was added and forgotten.
 * WS2 made it a list: two hosts register now (self-update and the branch-sync
 * guard), and a single slot would have evicted whichever registered first.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";
import { z } from "zod/v4";

process.env.RULE_MCP_STATE_DIR = mkdtempSync(join(tmpdir(), "rule-mcp-host-"));
process.env.RULE_MCP_NO_TELEMETRY = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";

const { callTool } = await import("../index.js");
const { registerCallHost, resetCallHosts, hostBanner } = await import("../call/_host.js");
const { registerTool } = await import("../_hooks.js");

before(() => {
  registerTool({
    name: "rule_tool_host_probe",
    entry: "action",
    description: "a probe tool",
    zodSchema: z.object({}),
    handler: () => Promise.resolve({ content: [{ type: "text", text: "ok" }] }),
  });
});

test("a host with no hooks adds nothing", async () => {
  resetCallHosts();
  registerCallHost({});

  assert.equal(hostBanner(), "", "no host means no banner");

  const result = await callTool("rule_tool_host_probe", {});

  assert.equal(result.content[0].text, "ok", "and the call is unaffected");
});

test("the pipeline kicks the host and prepends the banner it leaves", async () => {
  resetCallHosts();

  const kicks = [];

  registerCallHost({ beforeCall: (name) => kicks.push(name), banner: () => "UPDATE PENDING" });

  const result = await callTool("rule_tool_host_probe", {});

  assert.deepEqual(kicks, ["rule_tool_host_probe"], "the host is asked before the call runs");
  assert.match(result.content[0].text, /UPDATE PENDING/, "and its banner is prepended to the reply");
});

test("every registered host is asked and every banner is joined", async () => {
  resetCallHosts();

  const first = [];
  const second = [];

  registerCallHost({ beforeCall: (name) => first.push(name), banner: () => "FIRST" });
  registerCallHost({ beforeCall: (name) => second.push(name), banner: () => "SECOND" });

  assert.equal(hostBanner(), "FIRST\n\nSECOND", "both banners are joined in registration order");

  const result = await callTool("rule_tool_host_probe", {});

  assert.deepEqual(first, ["rule_tool_host_probe"], "the first host is asked");
  assert.deepEqual(second, ["rule_tool_host_probe"], "and so is the second, rather than replacing it");
  assert.match(result.content[0].text, /FIRST[\s\S]*SECOND/u, "and both banners reach the reply");
});

test("the update tool itself never kicks an update", async () => {
  resetCallHosts();

  const kicks = [];

  registerCallHost({ beforeCall: (name) => kicks.push(name), banner: () => "" });

  await callTool("rule_tool_update", {});

  assert.deepEqual(kicks, [], "an update call does not start another update");
});
