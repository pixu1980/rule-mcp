/**
 * @module cli/setup/rules-apply
 *
 * The instruction block, as the wizard's tasks and its uninstall scan want it.
 *
 * The block bytes live in `cli/installers/_instruction.data.js` - the short
 * routing block and the enforced-workflow rules, each inside its own
 * sentinels - and `_writers-text.js` writes them. This module is the adapter
 * that shapes the same targets and bytes as the `{ id, label, file, status }`
 * rows a task reports and a scan counts.
 *
 * Install and uninstall read one target list. The shell pair did not:
 * install.sh wrote `~/.cursorrules` while uninstall.sh cleaned
 * `~/.cursor/.cursorrules`, so Cursor kept the block forever. One list, one
 * `legacy` flag, and the asymmetry cannot come back.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { appendInstruction, removeInstruction } from "../installers/index.js";
import { INSTRUCTION_MARKER } from "../installers/_instruction.data.js";

/**
 * Where the block goes, and what has to exist for it to be written.
 * Same probes as the original installer: a file is only touched when the
 * agent is on this machine.
 */
const RULES_TARGETS = [
  { agent: "claude", probes: [".claude", ".claude.json"], file: ".claude/CLAUDE.md" },
  { agent: "gemini", probes: [".gemini", ".gemini/settings.json"], file: ".gemini/GEMINI.md" },
  { agent: "codex", probes: [".codex"], file: ".codex/AGENTS.md" },
  { agent: "cursor", probes: [".cursor"], file: ".cursorrules" },
  { agent: "pi", probes: [".pi/agent"], file: ".pi/agent/AGENTS.md" },
  // Never written now, always swept: an old install wrote `~/.cursorrules`
  // while uninstall cleaned `~/.cursor/.cursorrules`.
  { agent: "cursor-legacy", probes: [], file: ".cursor/.cursorrules", legacy: true },
];

/** One `{ agent, path, action }` row, as the wizard's `{ id, label, file, status }`. */
const toRow = (entry) => ({ id: entry.agent, label: entry.agent, file: entry.path, status: entry.action });

/** Targets that apply to this machine, narrowed to a selection when given. */
const rulesTargets = (home = homedir(), agents) => {
  const only = agents?.length ? new Set(agents) : null;

  return RULES_TARGETS.filter(
    (target) => (!only || only.has(target.agent)) && target.probes.some((probe) => existsSync(join(home, probe))),
  ).map((target) => ({ agent: target.agent, path: join(home, target.file) }));
};

/** Targets a removal sweeps: every file that carries the block. */
const removableRuleTargets = (home = homedir()) =>
  RULES_TARGETS.map((target) => ({ agent: target.agent, path: join(home, target.file) })).filter((target) => {
    try {
      return existsSync(target.path) && readFileSync(target.path, "utf8").includes(INSTRUCTION_MARKER);
    } catch {
      return false;
    }
  });

const applyRulesFiles = ({ home = homedir(), dryRun = false, remove = false, agents } = {}) =>
  (remove ? removableRuleTargets(home) : rulesTargets(home, agents)).map((target) => {
    const current = existsSync(target.path) ? readFileSync(target.path, "utf8") : "";
    const next = remove ? `${removeInstruction(current)}\n` : appendInstruction(current, { refresh: true });
    const action = remove ? "stripped" : current.includes(INSTRUCTION_MARKER) ? "refreshed" : "appended";

    if (dryRun || (remove && !existsSync(target.path))) {
      return { ...target, action: dryRun ? `would be ${action}` : "absent" };
    }

    mkdirSync(dirname(target.path), { recursive: true });
    writeFileSync(target.path, next);

    return { ...target, action };
  });

/** Targets whose agent is present on this machine, narrowed to a selection. */
export const installableTargets = (home, agents) =>
  rulesTargets(home, agents).map((target) => ({ id: target.agent, label: target.agent, file: target.path }));

/** Targets that currently carry the block, legacy paths included. */
export const removableTargets = (home) =>
  removableRuleTargets(home).map((target) => ({ id: target.agent, label: target.agent, file: target.path }));

/**
 * Write the block into the instruction files of the selected agents, replacing a
 * stale one rather than leaving it: the rules change with the server, and a
 * skip means the text a user installed once is the text they keep.
 *
 * @param {{ home?: string, dryRun?: boolean, agents?: string[] }} [options]
 * @returns {Array<{ id: string, label: string, file: string, status: string }>}
 */
export function applyRules({ home, dryRun = false, agents } = {}) {
  return applyRulesFiles({ home, dryRun, agents }).map(toRow);
}

/**
 * Strip the block from every target that carries it.
 *
 * @param {{ home?: string, dryRun?: boolean }} [options]
 * @returns {Array<{ id: string, label: string, file: string, status: string }>}
 */
export function removeRules({ home, dryRun = false } = {}) {
  return applyRulesFiles({ home, dryRun, remove: true }).map(toRow);
}
