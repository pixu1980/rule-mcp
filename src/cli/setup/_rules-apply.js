

/**
 * @module cli/setup/rules-apply
 *
 * Where the instruction block goes, and the file I/O that puts it there.
 *
 * Install and uninstall read the same target list. The shell pair did not:
 * install.sh wrote `~/.cursorrules` while uninstall.sh cleaned
 * `~/.cursor/.cursorrules`, so Cursor kept the block forever. One list, one
 * `legacy` flag for paths older installs may have written, and the asymmetry
 * cannot come back.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { hasRulesBlock, withRulesBlock, withoutRulesBlock } from "./_rules.js";

/**
 * Every instruction file this installer may touch.
 *
 * `when` decides whether install offers the target: the block belongs in an
 * agent's instruction file only when that agent is on the machine. Removal
 * ignores `when` and sweeps everything, legacy paths included.
 *
 * @param {{ home?: string, cwd?: string }} [scope]
 */
export function rulesTargets({ home = homedir(), cwd = process.cwd() } = {}) {
  return [
    { id: "claude", label: "Claude Code", file: join(home, ".claude", "CLAUDE.md"), when: [join(home, ".claude"), join(home, ".claude.json")] },
    { id: "gemini", label: "Gemini CLI", file: join(home, ".gemini", "GEMINI.md"), when: [join(home, ".gemini")] },
    { id: "codex", label: "Codex CLI", file: join(home, ".codex", "AGENTS.md"), when: [join(home, ".codex")] },
    { id: "cursor", label: "Cursor", file: join(home, ".cursorrules"), when: [join(home, ".cursor")] },
    { id: "cursor-legacy", label: "Cursor (legacy path)", file: join(home, ".cursor", ".cursorrules"), when: [], legacy: true },
    { id: "pi", label: "Pi", file: join(home, ".pi", "agent", "AGENTS.md"), when: [join(home, ".pi", "agent")] },
    { id: "project", label: "Project CLAUDE.md", file: join(cwd, "CLAUDE.md"), when: "always" },
  ];
}

/** Targets whose agent is present on this machine. */
export function installableTargets(scope) {
  return rulesTargets(scope).filter((target) => target.when === "always" || target.when.some((path) => existsSync(path)));
}

/** Targets that currently carry the block, legacy paths included. */
export function removableTargets(scope) {
  return rulesTargets(scope).filter((target) => existsSync(target.file) && hasRulesBlock(readFileSync(target.file, "utf8")));
}

const readIfPresent = (file) => (existsSync(file) ? readFileSync(file, "utf8") : "");

/**
 * Append the block to every installable target that does not already have it.
 *
 * @param {{ scope?: object, dryRun?: boolean }} [options]
 * @returns {Array<{ id: string, label: string, file: string, status: "written"|"present"|"planned" }>}
 */
export function applyRules({ scope, dryRun = false } = {}) {
  return installableTargets(scope).map((target) => {
    const current = readIfPresent(target.file);

    if (hasRulesBlock(current)) {
      return { id: target.id, label: target.label, file: target.file, status: "present" };
    }

    if (dryRun) {
      return { id: target.id, label: target.label, file: target.file, status: "planned" };
    }

    mkdirSync(dirname(target.file), { recursive: true });
    writeFileSync(target.file, withRulesBlock(current));

    return { id: target.id, label: target.label, file: target.file, status: "written" };
  });
}

/**
 * Strip the block from every target that carries it.
 *
 * @param {{ scope?: object, dryRun?: boolean }} [options]
 * @returns {Array<{ id: string, label: string, file: string, status: "removed"|"planned" }>}
 */
export function removeRules({ scope, dryRun = false } = {}) {
  return removableTargets(scope).map((target) => {
    if (dryRun) {
      return { id: target.id, label: target.label, file: target.file, status: "planned" };
    }

    writeFileSync(target.file, withoutRulesBlock(readFileSync(target.file, "utf8")));

    return { id: target.id, label: target.label, file: target.file, status: "removed" };
  });
}
