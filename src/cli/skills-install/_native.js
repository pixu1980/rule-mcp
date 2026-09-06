/** @module cli/skills-install/native - register skills with the host natively */

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Install skills into ~/.claude/skills/ for native Claude auto-discovery.
 * Claude Code reads SKILL.md files from ~/.claude/skills/<name>/ and
 * matches them automatically based on description keywords.
 * Non-destructive: skips already-installed skills.
 */
export function installNativeSkills(skills) {
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
