/**
 * @module core/tokensave
 *
 * tokensave branch awareness.
 *
 * tokensave keeps one code graph per branch. On an untracked branch its MCP
 * server silently serves the nearest ancestor's DB and appends a warning to
 * every response. Agents read that warning as "the graph is unreliable" and
 * fall back to grep + bulk file reads - the exact behavior the graph exists to
 * prevent, at a much higher token cost.
 *
 * This module turns that condition into an instruction: refresh the graph
 * (`tokensave branch add <branch>`), do not abandon it. It also carries the
 * remediation helpers used by the installer and the doctor.
 *
 * All readers are pure filesystem reads so they compose with the result cache;
 * the one side-effecting helper (autoTrackBranch) is fire-and-forget and
 * env-gated.
 *
 * @see module:core/agents/integrations - where the directive is emitted
 * @see https://github.com/aovestdipaperino/tokensave/blob/master/docs/BRANCHING-USER-GUIDE.md
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { hasTokensave } from "./detector.js";

/**
 * One-line directive appended to outputs when a project has a healthy graph.
 * Tells the agent to use the code graph instead of re-reading files.
 */
export const TOKENSAVE_DIRECTIVE =
  "## TOKENSAVE ACTIVE - this project has a .tokensave code graph. " +
  "Use tokensave_context / tokensave_search for code exploration; do NOT re-read files, " +
  "glob, or grep. The context below is intentionally trimmed - query the graph for detail.";

/** Env var that lets the server run `tokensave branch add` on its own. */
const AUTOTRACK_ENV = "RULE_MCP_TOKENSAVE_AUTOTRACK";

/** Branches already handed to `tokensave branch add` in this process. */
const _attempted = new Set();

/**
 * Whether tokensave-aware behavior is enabled for a project path.
 * Honors the RULE_MCP_NO_TOKENSAVE opt-out.
 *
 * @param {string} [projectDir] - Project root (defaults to cwd)
 * @returns {boolean}
 */
export function graphActive(projectDir = process.cwd()) {
  if (process.env.RULE_MCP_NO_TOKENSAVE === "1") {
    return false;
  }

  return hasTokensave(projectDir);
}

/** @param {string} path @returns {object|null} */
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Resolve the real git directory, following the `gitdir:` pointer a worktree
 * writes into `.git` instead of a directory.
 *
 * @param {string} projectDir
 * @returns {string|null}
 */
function gitDir(projectDir) {
  const dotGit = join(projectDir, ".git");
  try {
    if (statSync(dotGit).isDirectory()) {
      return dotGit;
    }

    const pointer = readFileSync(dotGit, "utf8").match(/^gitdir:\s*(.+)$/m);

    if (!pointer) {
      return null;
    }

    const target = pointer[1].trim();

    return isAbsolute(target) ? target : join(projectDir, target);
  } catch {
    return null;
  }
}

/**
 * The checked-out branch, read from git's HEAD. Null on a detached HEAD or
 * outside a repository - neither is a staleness signal.
 *
 * @param {string} projectDir
 * @returns {string|null}
 */
function currentBranch(projectDir) {
  const dir = gitDir(projectDir);

  if (!dir) {
    return null;
  }

  try {
    const head = readFileSync(join(dir, "HEAD"), "utf8").match(/^ref:\s*refs\/heads\/(.+)$/m);

    return head ? head[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * Branch-tracking state of a project's code graph.
 *
 * @param {string} [projectDir] - Project root (defaults to cwd)
 * @returns {{ present: boolean, branch: string|null, defaultBranch: string|null,
 *   tracked: boolean, stale: boolean, autoTrack: boolean }}
 */
export function branchState(projectDir = process.cwd()) {
  const absent = { present: false, branch: null, defaultBranch: null, tracked: false, stale: false, autoTrack: false };

  if (!graphActive(projectDir)) {
    return absent;
  }

  const meta = readJson(join(projectDir, ".tokensave", "branch-meta.json"));
  const config = readJson(join(projectDir, ".tokensave", "config.json"));
  const branch = currentBranch(projectDir);
  const defaultBranch = meta?.default_branch ?? null;
  // No metadata means single-branch indexing: nothing to be stale against.
  const tracked = !branch || !meta || branch === defaultBranch || Object.hasOwn(meta.branches ?? {}, branch);

  return {
    present: true,
    branch,
    defaultBranch,
    tracked,
    stale: !tracked,
    autoTrack: config?.auto_track === true,
  };
}

/**
 * The directive to emit for a project: empty when there is no graph, the plain
 * ACTIVE line when the graph matches the branch, and a refresh instruction when
 * it does not.
 *
 * @param {string} [projectDir] - Project root (defaults to cwd)
 * @returns {string}
 */
export function tokensaveDirective(projectDir = process.cwd()) {
  const state = branchState(projectDir);

  if (!state.present) {
    return "";
  }

  if (!state.stale) {
    return TOKENSAVE_DIRECTIVE;
  }

  return [
    `## TOKENSAVE STALE INDEX - branch '${state.branch}' is not tracked; the graph is served from ` +
      `'${state.defaultBranch ?? "the default branch"}' and can be wrong for this branch.`,
    `Run \`tokensave branch add ${state.branch}\` (copies the nearest ancestor DB + incremental sync, seconds), then re-run your query.`,
    "Do NOT fall back to grep, glob, or bulk file reads: a stale graph is a reason to refresh the graph, not to abandon it.",
  ].join("\n");
}

/**
 * One-line version of the staleness warning, for the workflow reminder.
 * Empty when the graph is absent or current.
 *
 * @param {string} [projectDir] - Project root (defaults to cwd)
 * @returns {string}
 */
export function staleLine(projectDir = process.cwd()) {
  const state = branchState(projectDir);

  if (!state.stale) {
    return "";
  }

  return (
    `- TOKENSAVE STALE: branch '${state.branch}' is untracked (serving '${state.defaultBranch ?? "default"}'). ` +
    `Run \`tokensave branch add ${state.branch}\` and keep querying the graph - do not switch to grep.`
  );
}

/**
 * Turn on tokensave's native auto-tracking for a project, so future branches
 * index themselves instead of falling back. Idempotent.
 *
 * @param {string} [projectDir] - Project root (defaults to cwd)
 * @returns {{ changed: boolean, path: string|null, reason: string }}
 */
export function enableAutoTrack(projectDir = process.cwd()) {
  const path = join(projectDir, ".tokensave", "config.json");

  if (!existsSync(path)) {
    return { changed: false, path: null, reason: "no tokensave config" };
  }

  const config = readJson(path);

  if (!config) {
    return { changed: false, path, reason: "unreadable config" };
  }

  if (config.auto_track === true) {
    return { changed: false, path, reason: "already enabled" };
  }

  try {
    writeFileSync(path, `${JSON.stringify({ ...config, auto_track: true }, null, 2)}\n`);

    return { changed: true, path, reason: "auto_track enabled" };
  } catch (error) {
    return { changed: false, path, reason: `write failed: ${error.message}` };
  }
}

/**
 * Fire-and-forget `tokensave branch add <branch>` when the graph is stale.
 * Gated by RULE_MCP_TOKENSAVE_AUTOTRACK=1 because it mutates the user's
 * project; detached so the current tool call never waits on indexing. At most
 * one attempt per branch per process.
 *
 * @param {string} [projectDir] - Project root (defaults to cwd)
 * @returns {{ ran: boolean, reason: string }}
 */
export function autoTrackBranch(projectDir = process.cwd()) {
  if (process.env[AUTOTRACK_ENV] !== "1") {
    return { ran: false, reason: "opt-in env not set" };
  }

  const state = branchState(projectDir);

  if (!state.stale) {
    return { ran: false, reason: "graph is current" };
  }

  const key = `${projectDir}#${state.branch}`;

  if (_attempted.has(key)) {
    return { ran: false, reason: "already attempted this session" };
  }

  _attempted.add(key);
  try {
    const child = spawn("tokensave", ["branch", "add", state.branch], {
      cwd: projectDir,
      detached: true,
      stdio: "ignore",
    });

    child.on("error", () => {
      /* tokensave not on PATH - the directive still tells the agent */
    });
    child.unref();

    return { ran: true, reason: `tokensave branch add ${state.branch}` };
  } catch (error) {
    return { ran: false, reason: `spawn failed: ${error.message}` };
  }
}
