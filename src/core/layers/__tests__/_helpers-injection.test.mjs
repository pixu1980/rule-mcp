

/**
 * A skill's guardrails import nothing (ADR 089).
 *
 * Node resolves a bare specifier by walking `node_modules` up from the
 * importing file, and a skill in a project's `.rule-mcp/skills` or in
 * the user's own has no `node_modules` above it. Anything a rule imported
 * therefore failed to load and the skill went silent - the extension point
 * worked only for rules that imported nothing at all.
 *
 * So nothing is imported: the helpers arrive in the context the check is
 * called with, and a rule file is a plain module that resolves the same
 * wherever the skill was dropped.
 */
import { strict as assert } from "node:assert";
import { globSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// Held in a constant so the repo's import-path gate reads this as the fixture
// text it is, rather than as a relative import this file makes.
const BARREL = `import { noTodo } from '${"./_no-todo.js"}';\n\nexport const GUARDRAILS = [noTodo];\n`;

const home = mkdtempSync(join(tmpdir(), "rule-inject-home-"));
const projectRoot = mkdtempSync(join(tmpdir(), "rule-inject-project-"));

process.env.RULE_MCP_HOME = home;
mkdirSync(join(projectRoot, ".git"), { recursive: true });

const { loadLayerGuardrails } = await import("../_guardrails.js");
const { checkCode } = await import("../../guardrails/index.js");
const { setSkillGuardrails } = await import("../../guardrails/index.js");

test.after(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(projectRoot, { recursive: true, force: true });
});

/** A skill whose one rule leans on an injected helper and imports nothing. */
function skill(base, name) {
  const dir = join(base, "skills", name, "guardrails");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(base, "skills", name, "SKILL.md"), `---\nname: ${name}\nguardrails: [no-todo]\n---\n\n# ${name}\n`);
  writeFileSync(
    join(dir, "_no-todo.js"),
    `export const noTodo = {
  id: "no-todo",
  label: "No TODO comments",
  check: (code, { helpers: { countedVerdict } }) => countedVerdict(code.includes("TODO") ? ["TODO"] : []),
};
`,
  );
  writeFileSync(join(dir, "index.js"), BARREL);
}

test("a rule in the user layer loads and runs with what it was handed", async () => {
  skill(home, "user-rules");

  const loaded = await loadLayerGuardrails({ cwd: projectRoot });
  const entry = loaded.get("user-rules");

  assert.deepEqual(
    entry.guardrails.map((rule) => rule.id),
    ["no-todo"],
    `it loads: ${JSON.stringify(loaded.problems)}`,
  );
  setSkillGuardrails(loaded);
  assert.equal(checkCode("user-rules", "a TODO here").allPass, false, "and the engine runs it against real input");
  assert.equal(checkCode("user-rules", "clean").allPass, true);
});

test("a rule in the project layer does the same", async () => {
  skill(join(projectRoot, ".rule-mcp"), "project-rules");

  const loaded = await loadLayerGuardrails({ cwd: projectRoot });

  assert.equal(loaded.get("project-rules").guardrails.length, 1, `it loads: ${JSON.stringify(loaded.problems)}`);
});

test("the bundled rules import nothing either", () => {
  // The point of the injection is that every layer is the same, so the rules
  // this server ships are held to it too.
  const offenders = [];

  for (const file of globSync("skills/*/guardrails/*.js")) {
    const source = readFileSync(file, "utf8");

    if (/^import .*from "(?!\.\/)/m.test(source)) {
      offenders.push(file);
    }
  }

  assert.deepEqual(offenders, [], "a rule that imports from outside its own folder is a rule that cannot travel");
});
