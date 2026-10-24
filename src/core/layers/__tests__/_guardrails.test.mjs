/**
 * Loading the rules a skill owns (ADR 089): a skill's guardrails/ folder is
 * imported from the layer that won, and what the frontmatter declared is
 * checked against what the folder actually exports.
 *
 * Importing a custom guardrail runs code the user put on disk. That is the
 * decision ADR 089 records; what is pinned here is that a broken one is
 * reported and stepped over rather than taking the server down with it.
 */
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-gr-home-"));
const projectRoot = mkdtempSync(join(tmpdir(), "rule-mcp-gr-project-"));

process.env.RULE_MCP_HOME = home;
mkdirSync(join(projectRoot, ".git"), { recursive: true });

const { loadLayerGuardrails } = await import("../_guardrails.js");

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(projectRoot, { recursive: true, force: true });
});

/** Write a skill that owns the given rules into a layer. */
function skill(base, name, { declares = [], exports_ = declares, inherits = [], body = "" } = {}) {
  const dir = join(base, "skills", name);
  mkdirSync(join(dir, "guardrails"), { recursive: true });

  const frontmatter = [`name: ${name}`, `guardrails: [${declares.join(", ")}]`, `inherits: [${inherits.join(", ")}]`].join("\n");
  writeFileSync(join(dir, "SKILL.md"), `---\n${frontmatter}\n---\n\n# ${name}\n`);

  const rules = exports_.map((id) => `{ id: ${JSON.stringify(id)}, label: ${JSON.stringify(id)}, check: () => ({ pass: true }) }`);
  writeFileSync(join(dir, "guardrails", "index.js"), body || `export const GUARDRAILS = [${rules.join(", ")}];\n`);

  return dir;
}

test("a skill's own rules load from its guardrails folder", async () => {
  skill(join(projectRoot, ".rule-mcp"), "rule-mcp-house-rules", { declares: ["no-todo", "no-fixme"] });

  const loaded = await loadLayerGuardrails({ cwd: projectRoot });
  const entry = loaded.get("rule-mcp-house-rules");

  assert.equal(entry.layer, "project", "the rules are attributed to the layer they came from");
  assert.deepEqual(
    entry.guardrails.map((rule) => rule.id),
    ["no-todo", "no-fixme"],
    "in the order the folder exports them",
  );
  assert.equal(typeof entry.guardrails[0].check, "function", "a rule arrives runnable");
});

test("the inheritance a skill declares is carried through", async () => {
  skill(join(projectRoot, ".rule-mcp"), "rule-mcp-house-child", { declares: ["child-rule"], inherits: ["rule-mcp-house-rules"] });

  const loaded = await loadLayerGuardrails({ cwd: projectRoot });

  assert.deepEqual(loaded.get("rule-mcp-house-child").inherits, ["rule-mcp-house-rules"]);
});

test("a skill with no guardrails folder loads with none", async () => {
  const dir = join(projectRoot, ".rule-mcp", "skills", "rule-mcp-text-only");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), "---\nname: rule-mcp-text-only\n---\n\n# Text only\n");

  const loaded = await loadLayerGuardrails({ cwd: projectRoot });

  assert.deepEqual(loaded.get("rule-mcp-text-only").guardrails, [], "a skill is allowed to be documentation and nothing else");
  assert.deepEqual(
    loaded.problems.filter((problem) => problem.skill === "rule-mcp-text-only"),
    [],
    "and that is not a problem",
  );
});

test("a guardrails folder that throws on import is reported, not fatal", async () => {
  skill(join(projectRoot, ".rule-mcp"), "rule-mcp-broken-rules", { declares: ["never-loads"], body: "throw new Error('boom');\n" });

  const loaded = await loadLayerGuardrails({ cwd: projectRoot });

  assert.deepEqual(loaded.get("rule-mcp-broken-rules").guardrails, [], "nothing is taken from a folder that would not load");
  assert.ok(
    loaded.problems.some((problem) => problem.skill === "rule-mcp-broken-rules" && /boom/.test(problem.reason)),
    `the failure is reported with its reason: ${JSON.stringify(loaded.problems)}`,
  );
  assert.ok(loaded.get("rule-mcp-house-rules").guardrails.length > 0, "and the other skills still load");
});

test("a rule that is not a rule is refused", async () => {
  skill(join(projectRoot, ".rule-mcp"), "rule-mcp-bad-shape", {
    declares: ["fine"],
    body: `export const GUARDRAILS = [{ id: "fine", check: () => ({ pass: true }) }, { label: "no id" }, { id: "no-check" }];\n`,
  });

  const loaded = await loadLayerGuardrails({ cwd: projectRoot });

  assert.deepEqual(
    loaded.get("rule-mcp-bad-shape").guardrails.map((rule) => rule.id),
    ["fine"],
    "an entry without an id or without a check is not a guardrail",
  );
  assert.equal(loaded.problems.filter((problem) => problem.skill === "rule-mcp-bad-shape").length, 2, "and each one is reported");
});

test("a frontmatter that does not match the folder is reported", async () => {
  skill(join(projectRoot, ".rule-mcp"), "rule-mcp-drifted", { declares: ["declared-only"], exports_: ["exported-only"] });

  const loaded = await loadLayerGuardrails({ cwd: projectRoot });
  const drift = loaded.problems.filter((problem) => problem.skill === "rule-mcp-drifted");

  assert.equal(drift.length, 2, "both directions of the drift are reported");
  assert.ok(
    drift.some((problem) => /declared-only/.test(problem.reason)),
    "a declared rule the folder does not export",
  );
  assert.ok(
    drift.some((problem) => /exported-only/.test(problem.reason)),
    "and an exported rule the frontmatter does not declare",
  );
});

test("the user layer's rules replace the project's for the same skill", async () => {
  skill(home, "rule-mcp-house-rules", { declares: ["user-rule"] });

  const loaded = await loadLayerGuardrails({ cwd: projectRoot });
  const entry = loaded.get("rule-mcp-house-rules");

  assert.equal(entry.layer, "user");
  assert.deepEqual(
    entry.guardrails.map((rule) => rule.id),
    ["user-rule"],
    "the whole folder is replaced, not merged with the project's",
  );
});
