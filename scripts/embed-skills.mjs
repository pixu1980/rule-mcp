#!/usr/bin/env node

/**
 * Embed skills into the build output.
 *
 * The repository's skills/ directory is the canonical source.
 * This script validates that the skills directory contains
 * the expected number of SKILL.md files and copies them
 * into the build staging area.
 *
 * NEVER reads $HOME — builds must be reproducible.
 */

import { existsSync, mkdirSync, readdirSync, rmSync, copyFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourceSkillsDir = join(root, "skills");
const targetSkillsDir = join(root, "skills"); // In-place: repo IS the source

// Minimum expected SKILL.md count (64 official rule-* + 1 rule)
const MIN_EXPECTED_SKILLS = 60;

// Directories/files to exclude from copy
const EXCLUDED_DIRS = new Set(["node_modules", ".git", "test-results", "__pycache__", ".DS_Store"]);
const EXCLUDED_FILES = new Set([".DS_Store", "package-lock.json", "pnpm-lock.yaml"]);

function shouldExclude(name, isDir) {
  if (isDir && EXCLUDED_DIRS.has(name)) {return true;}
  if (!isDir && EXCLUDED_FILES.has(name)) {return true;}
  return name === ".DS_Store";
}

function copyRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (shouldExclude(entry.name, entry.isDirectory())) {continue;}
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function countSkillFiles(dir) {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!(entry.isDirectory() && (entry.name === "rule" || entry.name.startsWith("rule-")))) {
      	continue;
      }

      const skillMd = join(dir, entry.name, "SKILL.md");
      if (existsSync(skillMd)) {count++;}
    }
  } catch { /* ignore */ }
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

// Since this is an in-place operation (repo IS the source),
// we just validate and report. No destructive operations needed.
// If a staging copy is needed for packaging, use a separate build step.

console.log(`Embedded ${sourceCount} skills (repository is canonical source).`);
