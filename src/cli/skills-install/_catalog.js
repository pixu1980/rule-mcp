/** @module cli/skills-install/catalog - discover, inspect and copy the shipped skills */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { getSkillsDirs as getSkillsDirectories } from "../paths/index.js";
import { parseSkillFrontmatter } from "../../core/skills/index.js";

/**
 * Read SKILL.md frontmatter for name/description/tags.
 * Delegates to the shared parseSkillFrontmatter (core/skills.js) so CLI output
 * and MCP server metadata can never diverge. Handles folded (>) and literal (|)
 * block scalars with chomping indicators (`>-`, `|+`, ...).
 */
export function readSkillMeta(skillDir) {
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
export function getAvailableSkills() {
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
export function isInstalled(name, targetDir) {
  return existsSync(join(targetDir, name, "SKILL.md"));
}

/**
 * Copy a skill directory recursively to the target.
 */
export function copySkill(source, targetDir, name) {
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
