/**
 * @module cli/skills-install
 *
 * Interactive skill installer for rule-mcp.
 * Shows a checkbox-style selection of available skills
 * and installs them to a global (~/.agents/skills/) or local (.agents/skills/) path.
 *
 * Usage:
 *   rule-mcp skills install
 *   rule-mcp skills install --scope project
 *   rule-mcp skills install --scope global --all
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { homedir } from "node:os";
import { multiselect, isCancel, cancel } from "@clack/prompts";
import { getSkillsDirs as getSkillsDirectories } from "./paths.js";
import { formatSkillsList } from "./tui.js";
import { parseSkillFrontmatter } from "../core/skills/_skills.js";

/**
 * Read SKILL.md frontmatter for name/description/tags.
 * Delegates to the shared parseSkillFrontmatter (core/skills.js) so CLI output
 * and MCP server metadata can never diverge. Handles folded (>) and literal (|)
 * block scalars with chomping indicators (`>-`, `|+`, ...).
 */
function readSkillMeta(skillDir) {
  try {
    const content = readFileSync(join(skillDir, "SKILL.md"), "utf8");
    const meta = parseSkillFrontmatter(content);

    return {
      name: meta.name || "",
      desc: meta.description || "",
      tags: meta.tags || [],
    };
  } catch {
    return { name: "", desc: "", tags: [] };
  }
}

/**
 * Get all available skills from the embedded directory.
 */
function getAvailableSkills() {
  const { embeddedSkills } = getSkillsDirectories();
  const skills = [];

  if (!existsSync(embeddedSkills)) {
    return skills;
  }

  for (const entry of readdirSync(embeddedSkills, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillDir = join(embeddedSkills, entry.name);

    if (!existsSync(join(skillDir, "SKILL.md"))) {
      continue;
    }

    const meta = readSkillMeta(skillDir);
    skills.push({
      name: entry.name,
      displayName: meta.name || entry.name,
      description: meta.desc || "(no description)",
      tags: meta.tags,
      source: skillDir,
    });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Check if a skill is already installed at the target path.
 */
function isInstalled(name, targetDir) {
  return existsSync(join(targetDir, name, "SKILL.md"));
}

/**
 * Copy a skill directory recursively to the target.
 */
function copySkill(source, targetDir, name) {
  const destination = join(targetDir, name);

  if (existsSync(destination)) {
    rmSync(destination, { recursive: true });
  }

  mkdirSync(destination, { recursive: true });

  const entries = readdirSync(source, { withFileTypes: true, recursive: true });

  for (const entry of entries) {
    const sourcePath = join(entry.parentPath ?? source, entry.name);
    const relPath = relative(source, sourcePath);
    const destinationPath = join(destination, relPath);

    if (entry.isDirectory()) {
      mkdirSync(destinationPath, { recursive: true });
    } else {
      mkdirSync(dirname(destinationPath), { recursive: true });
      copyFileSync(sourcePath, destinationPath);
    }
  }
}

/**
 * Install skills into ~/.claude/skills/ for native Claude auto-discovery.
 * Claude Code reads SKILL.md files from ~/.claude/skills/<name>/ and
 * matches them automatically based on description keywords.
 * Non-destructive: skips already-installed skills.
 */
function installNativeSkills(skills) {
  const claudeDir = join(homedir(), ".claude", "skills");
  let count = 0;
  try {
    mkdirSync(claudeDir, { recursive: true });

    for (const skill of skills) {
      const destination = join(claudeDir, skill.name);

      if (!existsSync(destination)) {
        copySkill(skill.source, join(homedir(), ".claude"), skill.name);
        count++;
      }
    }

    if (count > 0) {
      process.stdout.write(`Added ${count} skills to ~/.claude/skills/ for native Claude auto-discovery.\n`);
    }
  } catch {
    // Silently skip - .claude/skills/ is optional
  }
}

/**
 * Interactive multiselect over the skill catalog, backed by @clack/prompts.
 *
 * Returns the selected skill indices (ordered), or the clack cancel symbol.
 * `prompt` is injectable so tests can drive the selection without a TTY; the
 * default is @clack/prompts `multiselect` (battle-tested raw-mode handling on
 * macOS/Linux/Windows and Escape-to-cancel for free).
 */
export async function promptSkillSelection(items, { message, initialValues = [], prompt } = {}) {
  const run = prompt ?? ((options) => multiselect(options));

  return run({
    message,
    options: items.map((skill, index) => ({
      value: index,
      label: skill.displayName || skill.name,
      hint: skill.description,
    })),
    initialValues,
    required: false,
  });
}

/**
 * True when a prompt result means "user aborted".
 *
 * @clack/prompts returns its own cancel symbol; `undefined` also aborts so an
 * injected prompt (tests) and a failed raw-mode setup follow the same path.
 */
export const isCancelSelection = (value) => value === undefined || isCancel(value);

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
