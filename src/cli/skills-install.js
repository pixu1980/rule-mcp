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

// eslint-disable-next-line no-unused-vars
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { stdin as input, stdout as output } from "node:process";
// eslint-disable-next-line no-unused-vars
import { getSkillsDirs as getSkillsDirectories, pkg as package_ } from "./paths.js";
import { formatSkillsList } from "./tui.js";
import { parseSkillFrontmatter } from "../core/skills.js";

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
 * Render a checkbox-style interactive list.
 * Returns indices of selected items.
 */
async function interactiveSelect(items, { title, selected = [] }) {
  let cursor = 0;
  const checked = [...selected];
  const pageSize = Math.min(items.length, process.stdout.rows - 6 || 20);

  // Raw mode for keypress handling
  const readline = createInterface({ input, output });
  readline.close();

  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    function render() {
      output.write("\u{1B}[?25l"); // hide cursor
      output.write(`\n  ${title}\n\n`);
      const start = Math.max(0, Math.min(cursor - Math.floor(pageSize / 2), items.length - pageSize));
      const end = Math.min(start + pageSize, items.length);
      for (let index = start; index < end; index++) {
        const item = items[index];
        const check = checked.includes(index) ? "✓" : " ";
        const pointer = index === cursor ? "▶" : " ";
        const label = item.displayName || item.name;
        const desc = item.description ? ` - ${item.description}` : "";
        output.write(`  ${pointer} [${check}] ${label}${desc}\n`);
      }
      output.write(`\n  ␣ toggle   ↵ confirm   q quit\n`);
      output.write(`\u{1B}[${end - start + 4}A`); // move up
    }

    render();

    const onData = (key) => {
      switch (key) {
        case "\u{1B}[A":
        case "k": {
          // Up
          cursor = Math.max(0, cursor - 1);
          render();

          break;
        }
        case "\u{1B}[B":
        case "j": {
          // Down
          cursor = Math.min(items.length - 1, cursor + 1);
          render();

          break;
        }
        case " ": {
          // Toggle
          const index = checked.indexOf(cursor);
          if (index === -1) {
            checked.push(cursor);
          } else {
            checked.splice(index, 1);
          }
          render();

          break;
        }
        case "\r":
        case "\n": {
          // Confirm
          stdin.setRawMode(wasRaw ?? false);
          stdin.pause();
          stdin.removeListener("data", onData);
          output.write("\u{1B}[2K\u{1B}[?25h"); // show cursor
          output.write(`\u{1B}[${pageSize + 4}A`); // clear lines
          resolve([...checked]);

          break;
        }
        case "q": {
          // Quit
          stdin.setRawMode(wasRaw ?? false);
          stdin.pause();
          stdin.removeListener("data", onData);
          output.write("\u{1B}[2K\u{1B}[?25h");
          output.write(`\u{1B}[${pageSize + 4}A`);
          resolve([]);

          break;
        }
        case "a": {
          // Toggle all
          if (checked.length === items.length) {
            checked.length = 0;
          } else {
            for (let index = 0; index < items.length; index++) {
              if (!checked.includes(index)) {
                checked.push(index);
              }
            }
          }
          render();

          break;
        }
        // No default
      }
    };

    stdin.on("data", onData);
  });
}

/**
 * Interactive skill install command.
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

  // Batch mode: when --all is set or stdin is not a TTY, skip interactive UI
  if (selectAll || !process.stdin.isTTY) {
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

  // Interactive selection
  const selected = await interactiveSelect(
    skills.map((s) => ({
      name: s.name,
      displayName: s.name,
      description: s.description,
    })),
    {
      title: `Select skills to install (scope: ${scope} → ${targetDir})`,
      selected: preSelected,
    },
  );

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
  // eslint-disable-next-line no-unused-vars
  const { homeSkills, embeddedSkills } = getSkillsDirectories();
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
