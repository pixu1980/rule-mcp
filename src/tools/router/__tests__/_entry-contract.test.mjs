/**
 * ARCH-3: the tool surface is a contract, not a derivation.
 *
 * The entry of a tool was string surgery on its name: a name whose skill was
 * not found silently classified as an action, and nothing stated which tools a
 * client may pin or what a rename costs. The surface declares a version, a
 * rename map and an entry per tool now, and this test holds all three against
 * an independent derivation and the pinned surface.
 */
import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../../", import.meta.url));

const { DEPRECATIONS, TOOL_CONTRACT_VERSION, resolveToolName } = await import("../_contract.js");
const { declaredTools } = await import("../_surface.js");
const { entryPathOf } = await import("../_entry.js");
const { loadAllSkills } = await import("../../../core/skills/index.js");
const { bootstrapCoreTools } = await import("../../_bootstrap.js");

const ENTRIES = new Set(["router", "gateway", "skill", "action"]);

await loadAllSkills();
// The gateway and the apply tool belong to the invocation path, so the startup
// bootstrap registers them rather than the catalog (ARCH-1).
await bootstrapCoreTools();

/** The entry a tool name should declare, derived here on purpose (see the header). */
function expectedEntry(name) {
  if (name === "rule_tool") {
    return "router";
  }

  if (name === "rule_tool_gateway") {
    return "gateway";
  }

  return skillDirectories().has(`rule-${name.replace(/^rule_tool_/, "").replaceAll("_", "-")}`) ? "skill" : "action";
}

/** The bundled skill directories, as the surface test reads them. */
function skillDirectories() {
  return new Set(
    readdirSync(join(root, "skills"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("rule-mcp-"))
      .map((entry) => entry.name),
  );
}

test("the contract states a version and a rename map", () => {
  assert.match(TOOL_CONTRACT_VERSION, /^\d+\.\d+\.\d+$/, "a client pins a version, so it is one");
  assert.ok(Array.isArray(DEPRECATIONS), "the renames are a list, empty while none is pending");

  for (const entry of DEPRECATIONS) {
    assert.ok(entry.from, `${entry.to}: names the old name`);
    assert.ok(entry.to, `${entry.from}: names the tool that answers for it`);
    assert.match(entry.removeAfter, /^\d+\.\d+\.\d+$/, `${entry.from}: says the version that drops it`);
  }
});

test("a renamed tool still answers to the name it had", () => {
  const map = [{ from: "rule_tool_old", to: "rule_tool_new", removeAfter: "2.0.0" }];

  assert.deepEqual(resolveToolName("rule_tool_old", map), { name: "rule_tool_new", alias: "rule_tool_old" }, "an alias resolves");
  assert.deepEqual(resolveToolName("rule_tool_new", map), { name: "rule_tool_new" }, "a current name is not an alias");
  assert.deepEqual(resolveToolName("rule_tool_old"), { name: "rule_tool_old" }, "and the shipped map is the default");
});

test("every pinned tool declares the entry it is reached by", () => {
  const snapshot = JSON.parse(readFileSync(join(root, "tests/fixtures/tool-surface.json"), "utf8"));
  const declared = new Map(declaredTools().map((tool) => [tool.name, tool.entry]));

  assert.equal(declared.size, snapshot.count, "every pinned tool is registered, and nothing else is");

  for (const name of snapshot.tools) {
    const entry = declared.get(name);

    assert.ok(ENTRIES.has(entry), `${name} declares a known entry, got ${entry}`);
    assert.equal(entry, expectedEntry(name), `${name}: the declaration matches what the name means`);
    assert.equal(entryPathOf(name), entry, `${name}: the lookup answers what the tool declared`);
  }
});
