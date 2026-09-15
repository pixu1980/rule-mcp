/**
 * The 109 tool names are a public API, so they are pinned here.
 *
 * A client caches tool names, a slash command names one, a person writes one
 * in a config: a rename is not a refactor, it is a breaking change nobody
 * hears about until their prompt stops resolving. The snapshot in
 * tests/fixtures/tool-surface.json is the contract, and refreshing it is a
 * deliberate edit reviewed as part of the change that renamed something.
 *
 * The quoted counts in the handbook are checked too. They drifted once
 * already - comments and pages said 105, 95 and ~85 while the server served
 * 109 - and a number in prose has no compiler behind it.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../../", import.meta.url).pathname;
const snapshot = JSON.parse(readFileSync(`${root}tests/fixtures/tool-surface.json`, "utf8"));

/** The live surface, read from the binary a client would launch. */
const liveTools = () => {
  const out = execFileSync(process.execPath, [`${root}bin/rule-mcp.js`, "tools", "list", "--json"], {
    encoding: "utf8",
    env: { ...process.env, RULE_MCP_NO_AUTOUPDATE: "1", RULE_MCP_NO_TELEMETRY: "1" },
    timeout: 120_000,
  });

  return (JSON.parse(out).tools ?? JSON.parse(out)).map((tool) => tool.name);
};

test("the live tool surface matches the pinned one", () => {
  const live = liveTools().sort();

  assert.equal(snapshot.count, snapshot.tools.length, "the snapshot counts what it lists");
  assert.deepEqual(
    live.filter((name) => !snapshot.tools.includes(name)),
    [],
    "new tool: add it to tests/fixtures/tool-surface.json with the change that minted it",
  );
  assert.deepEqual(
    snapshot.tools.filter((name) => !live.includes(name)),
    [],
    "removed or renamed tool: that breaks clients, so the snapshot edit belongs to the release note",
  );
});

test("the handbook quotes the surface the server serves", () => {
  // The same split the census makes: a tool either serves a catalog skill or
  // is an action tool. Reimplemented here rather than imported so this test
  // fails when the derivation drifts, instead of agreeing with it.
  const catalog = readdirSync(`${root}skills`, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("rule-"))
    .map((entry) => entry.name);
  const skillToolNames = new Set(catalog.map((name) => `rule_tool_${name.slice("rule-".length).replaceAll("-", "_")}`));
  const actionTools = liveTools().filter((name) => !skillToolNames.has(name));
  const handbook = readFileSync(`${root}docs/09-tools.md`, "utf8");
  const quoted = handbook.match(/## Action tools \((\d+)\)/);

  assert.ok(quoted, "the tool reference states its action-tool count");
  assert.equal(Number(quoted[1]), actionTools.length, "docs/09-tools.md drifted - run `pnpm census`");

  const skillQuoted = handbook.match(/Arguments, the same for all (\d+)/);

  assert.ok(skillQuoted, "the skill-tool section states how many tools share the schema");
  assert.equal(Number(skillQuoted[1]), catalog.length, "the skill-tool count drifted - run `pnpm census`");
  assert.equal(actionTools.length + catalog.length, snapshot.count, "the two halves add up to the pinned surface");
});
