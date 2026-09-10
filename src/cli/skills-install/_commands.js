

/** @module cli/skills-install/commands - the install and list CLI commands */

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { cancel } from "@clack/prompts";
import { join } from "node:path";
import { homedir } from "node:os";
import { getSkillsDirs as getSkillsDirectories } from "../paths/index.js";
import { formatSkillsList } from "../index.js";
import { copySkill, getAvailableSkills, isInstalled } from "./_catalog.js";
import { installNativeSkills } from "./_native.js";
import { isCancelSelection, promptSkillSelection } from "./_picker.js";

/**
 * Interactive skill install command.
 * `prompt` is an optional injected selection function (tests); defaults to
 * @clack/prompts multiselect.
 */
export async function skillsInstallCommand(options = {}) {
  const scope = options.scope || "global";
  const selectAll = options.selectAll || false;

  const skills = getAvailableSkills();

  if (skills.length === 0) {
    process.stdout.write("No skills found to install.\n");

    return;
  }

  // Determine target dir
  const globalDir = join(homedir(), ".agents", "skills");
  const localDir = ".agents/skills";
  const targetDir = scope === "project" ? localDir : globalDir;

  // Batch mode: when --all is set or stdin is not a TTY, skip interactive UI.
  // `interactive: true` (tests) forces the interactive path anyway.
  if ((selectAll || !process.stdin.isTTY) && !options.interactive) {
    const toInstall = selectAll ? skills : skills.filter((s) => isInstalled(s.name, targetDir));

    if (toInstall.length === 0) {
      process.stdout.write("No skills selected. Nothing installed.\n");

      return;
    }

    mkdirSync(targetDir, { recursive: true });
    let installed = 0;

    for (const skill of toInstall) {
      copySkill(skill.source, targetDir, skill.name);
      installed++;
    }

    process.stdout.write(`Installed ${installed}/${skills.length} skills to ${targetDir}\n`);
    installNativeSkills(skills);

    return;
  }

  // Pre-check installed
  const preSelected = [];

  for (const [index, s] of skills.entries()) {
    if (isInstalled(s.name, targetDir)) {
      preSelected.push(index);
    }
  }

  // Interactive selection (TTY only; batch path above handles non-TTY/--all)
  const selected = await promptSkillSelection(
    skills.map((s) => ({
      name: s.name,
      displayName: s.name,
      description: s.description,
    })),
    {
      message: `Select skills to install (scope: ${scope} → ${targetDir})`,
      initialValues: preSelected,
      prompt: options.prompt,
    },
  );

  if (isCancelSelection(selected)) {
    cancel("Selection canceled - nothing installed.");
    process.exitCode = 1;

    return;
  }

  if (selected.length === 0) {
    process.stdout.write("No skills selected. Nothing installed.\n");

    return;
  }

  // Install
  mkdirSync(targetDir, { recursive: true });
  let installed = 0;

  for (const index of selected) {
    const skill = skills[index];
    copySkill(skill.source, targetDir, skill.name);
    installed++;
    process.stdout.write(`  ✓ ${skill.name}\n`);
  }

  process.stdout.write(`\nInstalled ${installed}/${skills.length} skills to ${targetDir}\n`);
  installNativeSkills(skills);
  process.stdout.write(`Run 'rule-mcp skills reload' to load them.\n`);
}

/**
 * Non-interactive skill list command.
 */
export function skillsListCommand(options = {}) {
  const skills = getAvailableSkills();
  const { homeSkills } = getSkillsDirectories();
  const installed = existsSync(homeSkills) ? readdirSync(homeSkills) : [];
  const rows = skills.map((s) => ({
    name: s.name,
    description: s.description,
    tags: s.tags,
    installed: installed.includes(s.name),
    source: s.source,
    installPath: join(homeSkills, s.name),
  }));

  if (options.json) {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
  } else {
    process.stdout.write(formatSkillsList(rows));
  }
}
