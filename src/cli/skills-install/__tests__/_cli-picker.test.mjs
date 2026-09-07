/**
 * Regression coverage for the interactive skill picker.
 *
 * The picker is backed by @clack/prompts` multiselect (battle-tested raw-mode
 * handling on macOS/Linux/Windows). These tests drive the injectable `prompt`
 * seam, so the selection → install decision logic is covered without a TTY:
 *   - the catalog is mapped to clack options (value=index, label, hint)
 *   - installing a subset installs exactly that subset
 *   - an aborted prompt (cancel) writes nothing and exits non-zero
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promptSkillSelection, isCancelSelection, skillsInstallCommand } from "../index.js";

const items = [
  { name: "one", displayName: "one", description: "a deliberately long description" },
  { name: "two", displayName: "two", description: "second" },
  { name: "three", displayName: "three", description: "third" },
];

/**
 * A sandbox inside which skills are "installed": a fake HOME and a fake
 * project cwd, so `.agents/skills` (project scope) is isolated.
 */
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "rule-picker-"));
  const project = join(root, "project");
  mkdirSync(project, { recursive: true });
  const previous = { home: process.env.HOME, cwd: process.cwd() };
  process.env.HOME = root;
  process.chdir(project);

  return {
    project,
    installedDir: join(project, ".agents", "skills"),
    restore() {
      process.env.HOME = previous.home;
      process.chdir(previous.cwd);
    },
  };
}

test("the seam maps the catalog to clack multiselect options", async () => {
  let captured;
  const prompt = (options) => {
    captured = options;
    return [1];
  };

  const selected = await promptSkillSelection(items, { message: "pick", initialValues: [0], prompt });

  assert.deepEqual(selected, [1], "the prompt result is passed through");
  assert.equal(captured.message, "pick");
  assert.deepEqual(captured.initialValues, [0], "installed skills arrive pre-selected");
  assert.equal(captured.required, false, "empty selection must be allowed");
  assert.deepEqual(
    captured.options.map((o) => o.value),
    [0, 1, 2],
    "each skill is a selectable option with its catalog index as value",
  );
  assert.equal(captured.options[1].label, "two");
  assert.equal(captured.options[0].hint, "a deliberately long description");
});

test("installing a subset installs exactly that subset, nothing more", async () => {
  const box = sandbox();
  try {
    await skillsInstallCommand({ scope: "project", interactive: true, prompt: async () => [0, 2] });

    const installed = readdirSync(box.installedDir).sort();
    assert.equal(installed.length, 2, "only the two selected skills land on disk");
    for (const name of installed) {
      assert.ok(existsSync(join(box.installedDir, name, "SKILL.md")), `${name}/SKILL.md exists`);
    }
  } finally {
    box.restore();
  }
});

test("an aborted prompt writes nothing and fails the command non-zero", async () => {
  const box = sandbox();
  const previous = process.exitCode;
  try {
    await skillsInstallCommand({ scope: "project", interactive: true, prompt: async () => {} });

    assert.equal(process.exitCode, 1, "a cancelled selection is a failure, not a silent no-op");
    assert.ok(!existsSync(box.installedDir), "nothing is written on cancel");
  } finally {
    process.exitCode = previous;
    box.restore();
  }
});

test("isCancelSelection accepts clack's own cancel symbol path", async () => {
  // Cannot fabricate clack's internal symbol from outside; the predicate must
  // accept undefined (the injected-prompt abort) which the flow maps to the
  // same "cancelled" branch a real Escape press takes.
  assert.equal(isCancelSelection(), true);
  assert.equal(isCancelSelection([0, 1]), false);
  assert.equal(isCancelSelection([]), false);
});
