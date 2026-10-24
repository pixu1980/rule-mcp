

/**
 * Branch coverage for the skills install/list commands: the batch path with
 * only recopied skills, the interactive path answering nothing, everything, or
 * a subset, and the list with no installed directory and without `--json`.
 *
 * Every run is sandboxed to a scratch home, so the catalog copies and the
 * persona skills land there rather than in the machine's real skills folder.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const home = mkdtempSync(join(tmpdir(), "rule-mcp-skills-commands-branches-"));

process.env.HOME = home;

const { copySkill, getAvailableSkills } = await import("../_catalog.js");
const { skillsInstallCommand, skillsListCommand } = await import("../_commands.js");

test.after(() => rmSync(home, { recursive: true, force: true }));

/** Collect what a command writes to stdout. */
async function capture(run) {
  const chunks = [];
  const write = process.stdout.write;

  process.stdout.write = (chunk) => {
    chunks.push(String(chunk));

    return true;
  };

  try {
    await run();
  } finally {
    process.stdout.write = write;
  }

  return chunks.join("");
}

const targetDir = () => join(home, ".agents", "skills");

test("the list prints a table when --json is absent and the install dir does not exist", async () => {
  assert.equal(existsSync(targetDir()), false, "nothing is installed yet");

  const out = await capture(() => skillsListCommand({}));

  assert.match(out, /rule-mcp skills/);
  assert.match(out, /Skill catalog/);
  assert.match(out, /rule-mcp-/, "the catalog rows are listed");
});

test("a batch run without --all reinstalls only the skills already present", async () => {
  const skills = getAvailableSkills();
  const target = targetDir();

  mkdirSync(target, { recursive: true });
  copySkill(skills[0].source, target, skills[0].name);

  const out = await capture(() => skillsInstallCommand({}));

  assert.match(out, new RegExp(`Installed 1/${skills.length} skills`), "only the installed one is picked up");
  assert.doesNotMatch(out, /Generated/, "no persona skills are generated when not installing everything");
});

test("an interactive answer with nothing ticked installs nothing", async () => {
  const out = await capture(() => skillsInstallCommand({ interactive: true, prompt: async () => [] }));

  assert.match(out, /No skills selected\. Nothing installed\./);
});

test("an interactive answer ticking one skill generates no personas", async () => {
  const out = await capture(() => skillsInstallCommand({ interactive: true, prompt: async (options) => [options.options[0].value] }));

  assert.match(out, /Installed 1\/\d+ skills/, "one tick is one skill");
  assert.doesNotMatch(out, /Generated/, "personas are for a full selection, not a subset");
});

test("an interactive answer ticking everything writes the persona skills", async () => {
  const skills = getAvailableSkills();
  const out = await capture(() =>
    skillsInstallCommand({
      interactive: true,
      prompt: async (options) => options.options.map((option) => option.value),
    }),
  );

  assert.match(out, new RegExp(`Installed ${skills.length}/${skills.length} skills`));
  assert.match(out, /Generated \d+ persona skill\(s\)/, "a full selection keeps the personas in step");
  assert.match(out, /skills reload/, "and tells the user how to load them");
});
