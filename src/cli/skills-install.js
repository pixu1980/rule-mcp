/**
 * @module cli/skills-install
 *
 * Interactive skill installer for pix-galaxy-mcp.
 * Shows a checkbox-style selection of available skills
 * and installs them to a global (~/.agents/skills/) or local (.agents/skills/) path.
 *
 * Usage:
 *   pix-galaxy-mcp skills install
 *   pix-galaxy-mcp skills install --scope project
 *   pix-galaxy-mcp skills install --scope global --all
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { stdin as input, stdout as output } from "node:process";
import { getSkillsDirs, pkg } from "./paths.js";
import { formatSkillsList } from "./tui.js";

/**
 * Read SKILL.md frontmatter for name/description.
 */
function readSkillMeta(skillDir) {
  try {
    const content = readFileSync(join(skillDir, "SKILL.md"), "utf8");
    const name = content.match(/^name:\s*(.+)/m)?.[1]?.trim() || "";
    let desc = "";
    const descMatch = content.match(/^description:\s*(.*)$/m);
    if (descMatch) {
      const marker = descMatch[1].trim();
      if (marker === ">" || marker === "|") {
        const after = content.slice(descMatch.index + descMatch[0].length).split("\n");
        const parts = [];
        for (const line of after) {
          if (!line.startsWith(" ") && !line.startsWith("\t") && line.trim()) break;
          if (line.trim()) parts.push(line.trim());
        }
        desc = marker === ">" ? parts.join(" ") : parts.join("\n");
      } else {
        desc = marker;
      }
    }
    const tags = content.match(/^tags:\s*\[(.+)\]/m)?.[1]?.split(",").map(s => s.trim()) || [];
    return { name, desc, tags };
  } catch {
    return { name: "", desc: "", tags: [] };
  }
}

/**
 * Get all available skills from the embedded directory.
 */
function getAvailableSkills() {
  const { embeddedSkills } = getSkillsDirs();
  const skills = [];
  if (!existsSync(embeddedSkills)) return skills;
  for (const entry of readdirSync(embeddedSkills, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillDir = join(embeddedSkills, entry.name);
    if (!existsSync(join(skillDir, "SKILL.md"))) continue;
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
  const dest = join(targetDir, name);
  if (existsSync(dest)) rmSync(dest, { recursive: true });
  mkdirSync(dest, { recursive: true });

  const entries = readdirSync(source, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    const srcPath = join(source, entry.parentPath ?? source, entry.name);
    const relPath = relative(source, srcPath);
    const destPath = join(dest, relPath);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
    } else {
      mkdirSync(join(dest, relative(source, join(source, entry.parentPath ?? ""))), { recursive: true });
      copyFileSync(srcPath, destPath);
    }
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
      output.write("\x1B[?25l"); // hide cursor
      output.write(`\n  ${title}\n\n`);
      const start = Math.max(0, Math.min(cursor - Math.floor(pageSize / 2), items.length - pageSize));
      const end = Math.min(start + pageSize, items.length);
      for (let i = start; i < end; i++) {
        const item = items[i];
        const check = checked.includes(i) ? "✓" : " ";
        const pointer = i === cursor ? "▶" : " ";
        const label = item.displayName || item.name;
        const desc = item.description ? ` — ${item.description}` : "";
        output.write(`  ${pointer} [${check}] ${label}${desc}\n`);
      }
      output.write(`\n  ␣ toggle   ↵ confirm   q quit\n`);
      output.write(`\x1B[${end - start + 4}A`); // move up
    }

    render();

    const onData = (key) => {
      if (key === "\x1B[A" || key === "k") {
        // Up
        cursor = Math.max(0, cursor - 1);
        render();
      } else if (key === "\x1B[B" || key === "j") {
        // Down
        cursor = Math.min(items.length - 1, cursor + 1);
        render();
      } else if (key === " ") {
        // Toggle
        const idx = checked.indexOf(cursor);
        if (idx >= 0) checked.splice(idx, 1);
        else checked.push(cursor);
        render();
      } else if (key === "\r" || key === "\n") {
        // Confirm
        stdin.setRawMode(wasRaw ?? false);
        stdin.pause();
        stdin.removeListener("data", onData);
        output.write("\x1B[2K\x1B[?25h"); // show cursor
        output.write(`\x1B[${pageSize + 4}A`); // clear lines
        resolve([...checked]);
      } else if (key === "q") {
        // Quit
        stdin.setRawMode(wasRaw ?? false);
        stdin.pause();
        stdin.removeListener("data", onData);
        output.write("\x1B[2K\x1B[?25h");
        output.write(`\x1B[${pageSize + 4}A`);
        resolve([]);
      } else if (key === "a") {
        // Toggle all
        if (checked.length === items.length) checked.length = 0;
        else for (let i = 0; i < items.length; i++) if (!checked.includes(i)) checked.push(i);
        render();
      }
    };

    stdin.on("data", onData);
  });
}

/**
 * Interactive skill install command.
 */
export async function skillsInstallCommand(opts = {}) {
  const scope = opts.scope || "global";
  const selectAll = opts.selectAll || false;

  const skills = getAvailableSkills();
  if (skills.length === 0) {
    process.stdout.write("No skills found to install.\n");
    return;
  }

  // Determine target dir
  const globalDir = join(homedir(), ".agents", "skills");
  const localDir = ".agents/skills";
  const targetDir = scope === "project" ? localDir : globalDir;

  // Pre-check installed
  const preSelected = selectAll ? skills.map((_, i) => i) : skills.reduce((acc, s, i) => {
    if (isInstalled(s.name, targetDir)) acc.push(i);
    return acc;
  }, []);

  // Interactive selection
  const selected = await interactiveSelect(skills.map(s => ({
    name: s.name,
    displayName: s.name,
    description: s.description,
  })), {
    title: `Select skills to install (scope: ${scope} → ${targetDir})`,
    selected: preSelected,
  });

  if (selected.length === 0) {
    process.stdout.write("No skills selected. Nothing installed.\n");
    return;
  }

  // Install
  mkdirSync(targetDir, { recursive: true });
  let installed = 0;
  for (const idx of selected) {
    const skill = skills[idx];
    copySkill(skill.source, targetDir, skill.name);
    installed++;
    process.stdout.write(`  ✓ ${skill.name}\n`);
  }

  process.stdout.write(`\nInstalled ${installed}/${skills.length} skills to ${targetDir}\n`);
  process.stdout.write(`Run 'pix-galaxy-mcp skills reload' to load them.\n`);
}

/**
 * Non-interactive skill list command.
 */
export function skillsListCommand(opts = {}) {
  const skills = getAvailableSkills();
  const { homeSkills, embeddedSkills } = getSkillsDirs();
  const installed = existsSync(homeSkills) ? readdirSync(homeSkills) : [];
  const rows = skills.map(s => ({
    name: s.name,
    description: s.description,
    tags: s.tags,
    installed: installed.includes(s.name),
    source: s.source,
    installPath: join(homeSkills, s.name),
  }));

  if (opts.json) {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
  } else {
    process.stdout.write(formatSkillsList(rows));
  }
}
