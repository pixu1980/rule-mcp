#!/usr/bin/env node

/**
 * Embed skills into the build output.
 *
 * The repository's `skills/` directory IS the canonical source, so there is
 * nothing to copy: this script refuses the build when that directory is
 * missing or has lost skills, and reports the count it found.
 *
 * It carried a recursive copy and an exclusion table for a staging directory
 * that no longer exists - dead since the build went in-place, and deleted by
 * the simplicity plan (SIMP-2) rather than modernized into `fs.cpSync`.
 *
 * NEVER reads $HOME - builds must be reproducible.
 */

import { existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..", "..");
const sourceSkillsDir = join(root, "skills");

// Minimum expected SKILL.md count (64 official rule-* + 1 rule)
const MIN_EXPECTED_SKILLS = 60;

function countSkillFiles(dir) {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!(entry.isDirectory() && (entry.name === "rule" || entry.name.startsWith("rule-")))) {
        continue;
      }

      const skillMd = join(dir, entry.name, "SKILL.md");
      if (existsSync(skillMd)) {
        count++;
      }
    }
  } catch {
    /* ignore */
  }
  return count;
}

console.log("Embedding skills...");

// Validate source exists and has enough skills
if (!existsSync(sourceSkillsDir)) {
  console.error("ERROR: skills/ directory not found. Cannot embed.");
  process.exit(1);
}

const sourceCount = countSkillFiles(sourceSkillsDir);
if (sourceCount < MIN_EXPECTED_SKILLS) {
  console.error(`ERROR: Only ${sourceCount} SKILL.md files found in skills/. Expected at least ${MIN_EXPECTED_SKILLS}. Refusing to continue.`);
  process.exit(1);
}

console.log(`  ✓ Source skills/ contains ${sourceCount} SKILL.md files (minimum ${MIN_EXPECTED_SKILLS})`);

// In-place: validate and report. A staging copy, if one is ever needed for
// packaging, is a separate build step.
console.log(`Embedded ${sourceCount} skills (repository is canonical source).`);
