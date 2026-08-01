#!/usr/bin/env node

/**
 * Install only the skills bundled in this repository to ~/.agents/skills/.
 * Existing bundled skills are replaced; unrelated custom skills are preserved.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(repositoryRoot, "skills");
const targetRoot = join(homedir(), ".agents", "skills");

if (!existsSync(sourceRoot)) {
  console.error(`Skills directory not found: ${sourceRoot}`);
  process.exit(1);
}

const skills = readdirSync(sourceRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(join(sourceRoot, entry.name, "SKILL.md")))
  .map(entry => entry.name)
  .sort();

if (skills.length === 0) {
  console.error(`No skills found in ${sourceRoot}`);
  process.exit(1);
}

mkdirSync(targetRoot, { recursive: true });

for (const skill of skills) {
  const destination = join(targetRoot, skill);
  rmSync(destination, { recursive: true, force: true });
  cpSync(join(sourceRoot, skill), destination, { recursive: true });
  console.log(`  ✓ ${skill}`);
}

console.log(`\nInstalled ${skills.length} skills to ${targetRoot}`);
