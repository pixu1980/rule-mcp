

/**
 * @module core/commit/detect
 *
 * What a project already has: its package manager and its hook mechanism.
 *
 * Detection never replaces what it finds. A project running Husky keeps Husky,
 * one with a tracked `.githooks/` or a configured `core.hooksPath` keeps that
 * directory, and only a project with none of them is offered a new mechanism.
 */

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { git, isGitRepository } from "../git/index.js";

/** Lockfile to package manager, strongest first. */
const LOCKFILES = [
  ["pnpm-lock.yaml", "pnpm"],
  ["package-lock.json", "npm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
];

/**
 * The package manager the project already uses.
 *
 * @param {string} projectDir
 * @returns {string|null} null when the project is not a package at all
 */
export function detectPackageManager(projectDir) {
  for (const [lockfile, manager] of LOCKFILES) {
    if (existsSync(join(projectDir, lockfile))) {
      return manager;
    }
  }

  return existsSync(join(projectDir, "package.json")) ? "npm" : null;
}

/**
 * The parsed `package.json`, or null when there is none.
 *
 * @param {string} projectDir
 * @returns {object|null}
 */
export function readManifest(projectDir) {
  try {
    return JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

/**
 * Git's own hooks directory for this working tree.
 *
 * @param {string} projectDir
 * @returns {string}
 */
export function gitHooksDir(projectDir) {
  const directory = git(projectDir, ["rev-parse", "--absolute-git-dir"]);

  return directory ? join(directory, "hooks") : "";
}

/**
 * @typedef {object} Governance
 * @property {"husky"|"githooks"|"hooks-path"|"git"|"none"} mechanism
 * @property {string} hooksDir
 * @property {string|null} packageManager
 * @property {boolean} husky already configured somewhere
 */

/**
 * Which hook mechanism this project already has.
 *
 * @param {string} projectDir
 * @returns {Governance}
 */
export function detectGovernance(projectDir) {
  const packageManager = detectPackageManager(projectDir);

  if (!isGitRepository(projectDir)) {
    return { mechanism: "none", hooksDir: "", packageManager, husky: false };
  }

  const manifest = readManifest(projectDir);
  const husky = existsSync(join(projectDir, ".husky")) || Boolean(manifest?.devDependencies?.husky);

  if (husky) {
    return { mechanism: "husky", hooksDir: join(projectDir, ".husky"), packageManager, husky: true };
  }

  // A tracked `.githooks/` directory is the model this server's own repository
  // uses, and a project that has one has a hook mechanism already.
  if (existsSync(join(projectDir, ".githooks"))) {
    return { mechanism: "githooks", hooksDir: join(projectDir, ".githooks"), packageManager, husky: false };
  }

  const configured = git(projectDir, ["config", "--get", "core.hooksPath"]);

  if (configured) {
    return {
      mechanism: "hooks-path",
      hooksDir: isAbsolute(configured) ? configured : join(projectDir, configured),
      packageManager,
      husky: false,
    };
  }

  return { mechanism: "git", hooksDir: gitHooksDir(projectDir), packageManager, husky: false };
}
