#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const targetSkillsDir = join(root, "skills");

// Source: ~/.agents/skills/pix-*
const homeSkills = join(process.env.HOME || process.env.USERPROFILE || "/tmp", ".agents", "skills");

// Directories/files to exclude from copy
const EXCLUDED_DIRS = new Set(["node_modules", ".git", "test-results", "__pycache__", ".DS_Store"]);
const EXCLUDED_FILES = new Set([".DS_Store", "package-lock.json", "pnpm-lock.yaml"]);

function shouldExclude(name, isDir) {
  if (isDir && EXCLUDED_DIRS.has(name)) return true;
  if (!isDir && EXCLUDED_FILES.has(name)) return true;
  return name === ".DS_Store";
}

function copyRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (shouldExclude(entry.name, entry.isDirectory())) continue;
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

console.log("Embedding skills...");

// Remove previous embedded skills
if (existsSync(targetSkillsDir)) {
  rmSync(targetSkillsDir, { recursive: true });
}

mkdirSync(targetSkillsDir, { recursive: true });

// Try to copy from home agents skills
let copied = 0;
if (existsSync(homeSkills)) {
  for (const entry of readdirSync(homeSkills, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith("pix-") || entry.name.startsWith("pix-")) {
      const src = join(homeSkills, entry.name);
      const dest = join(targetSkillsDir, entry.name);
      copyRecursive(src, dest);
      copied++;
      console.log(`  ✓ ${entry.name}`);
    }
  }
}

if (copied === 0) {
  console.log("  ⚠ No pix skills found in ~/.agents/skills/. Creating placeholder.");
  mkdirSync(join(targetSkillsDir, "pix"), { recursive: true });
}

console.log(`Embedded ${copied} skills into ${targetSkillsDir}`);
