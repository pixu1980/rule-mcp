/**
 * @module core/self-update
 *
 * Forced self-update for local git-clone installs. On the first tool call of a
 * session the server fetches upstream, fast-forwards if behind, hot-reloads
 * skills, and — when server CODE changed — schedules a restart so the update
 * takes effect. It is visible to the user (a banner is prepended to the first
 * tool result) and forced, but always fail-open: any error, offline network,
 * dirty tree, missing upstream, or non-git install skips silently and the
 * user's actual call proceeds on the current version.
 *
 * Safety:
 *   - fast-forward only (`git merge --ff-only`) — never discards local work
 *   - skipped when the working tree is dirty, HEAD is detached, or no upstream
 *   - RULE_MCP_NO_AUTOUPDATE=1 disables the check
 *   - RULE_MCP_NO_AUTORESTART=1 keeps the process alive on code changes
 *
 * @see module:cli/paths — getRepoRoot, detectInstallType
 * @see module:core/skills — loadAllSkills(true) hot-reload
 */

import { execFileSync } from "node:child_process";
import { getRepoRoot, detectInstallType } from "../cli/paths.js";

/** Once-per-process guard for the forced check. */
let _checked = false;
/** Single-flight promise so concurrent first-calls share one check. */
let _inflight = null;
/** Banner to prepend to the next tool result (consumed once). */
let _pendingBanner = null;

/** @returns {boolean} */
export function autoUpdateEnabled() {
  return process.env.RULE_MCP_NO_AUTOUPDATE !== "1";
}

/** Run a git command in the repo root; return trimmed stdout or null on failure. */
function git(args, root, timeout = 8000) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      timeout,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

/** Manual update command hint for install types we cannot auto-update. */
function manualHint(type) {
  if (type === "npm") return "Update with: pnpm add -g rule-mcp@latest (then restart the server).";
  if (type === "docker") return "Update with: docker compose pull && docker compose up -d.";
  return "Auto-update is only available for git-clone installs.";
}

/**
 * Perform the actual fetch / fast-forward / classify. Pure of process-lifecycle
 * concerns (restart is decided by the caller). Never throws.
 *
 * @param {{ reloadSkills?: boolean }} [opts]
 * @returns {Promise<{
 *   checked: boolean, updated: boolean, skipped?: boolean, reason?: string,
 *   from?: string, to?: string, count?: number,
 *   changedSkills?: boolean, changedCode?: boolean, note?: string
 * }>}
 */
export async function runSelfUpdate(opts = {}) {
  const { reloadSkills = true } = opts;
  if (!autoUpdateEnabled()) return { checked: false, updated: false, skipped: true, reason: "disabled" };

  const type = detectInstallType();
  if (type !== "git") {
    return { checked: true, updated: false, skipped: true, reason: type, note: manualHint(type) };
  }

  const root = getRepoRoot();

  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], root);
  if (!branch || branch === "HEAD") return { checked: true, updated: false, skipped: true, reason: "detached-head" };

  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], root);
  if (!upstream) return { checked: true, updated: false, skipped: true, reason: "no-upstream" };

  // Only TRACKED modifications block a fast-forward; untracked artifacts
  // (.tokensave/, build output, caches) are irrelevant to ff safety.
  const dirty = git(["status", "--porcelain", "--untracked-files=no"], root);
  if (dirty === null) return { checked: true, updated: false, skipped: true, reason: "git-error" };
  if (dirty.length > 0) return { checked: true, updated: false, skipped: true, reason: "dirty-tree" };

  // Fetch (network); fail-open on offline/timeout.
  const fetched = git(["fetch", "--quiet"], root);
  if (fetched === null) return { checked: true, updated: false, skipped: true, reason: "fetch-failed" };

  const before = git(["rev-parse", "HEAD"], root);
  const remote = git(["rev-parse", "@{u}"], root);
  if (!before || !remote) return { checked: true, updated: false, skipped: true, reason: "git-error" };
  if (before === remote) return { checked: true, updated: false };

  // Fast-forward only — never clobber local commits.
  const merged = git(["merge", "--ff-only", "@{u}"], root);
  if (merged === null) return { checked: true, updated: false, skipped: true, reason: "not-fast-forward" };

  const after = git(["rev-parse", "HEAD"], root);
  const diff = git(["diff", "--name-only", before, after], root) ?? "";
  const changed = diff.split("\n").filter(Boolean);
  const changedSkills = changed.some((p) => p.startsWith("skills/"));
  const changedCode = changed.some((p) => /^(?:src|bin)\//.test(p) || p === "package.json");

  if (changedSkills && reloadSkills) {
    try {
      const { loadAllSkills } = await import("./skills.js");
      await loadAllSkills(true); // re-register tools + flush skill/result caches
    } catch { /* skills reload best-effort */ }
  }

  return {
    checked: true,
    updated: true,
    from: before.slice(0, 7),
    to: after.slice(0, 7),
    count: changed.length,
    changedSkills,
    changedCode,
  };
}

/**
 * Build the user-visible banner for an update result, or null when there is
 * nothing worth showing (silent skips stay silent).
 *
 * @param {object} r — runSelfUpdate result
 * @returns {string|null}
 */
export function buildBanner(r) {
  if (!r) return null;
  if (r.updated) {
    const what = r.changedSkills && r.changedCode ? "skills + code"
      : r.changedCode ? "code"
      : r.changedSkills ? "skills"
      : "files";
    let msg = `🔄 Updating MCP server — rule-mcp updated ${r.from}→${r.to} (${r.count} ${what} file(s)).`;
    if (r.changedSkills) msg += " Skills hot-reloaded.";
    return msg;
  }
  // Non-git installs get a one-line hint so the user knows how to update.
  if (r.skipped && r.note) return `ℹ️ rule-mcp is up to date on disk. ${r.note}`;
  return null;
}

/**
 * Decide and schedule a restart when server code changed. Returns a short note
 * for the banner, or null when no restart is needed/allowed.
 *
 * The restart is a deferred process exit: service managers (launchd KeepAlive,
 * systemd Restart, docker restart policy) and respawning MCP clients bring the
 * process back running the new code. The exit is delayed so the current tool
 * response flushes first.
 *
 * A shared daemon serves several clients at once (Pi + VS Code + …), so a forced
 * exit would drop every other client's session mid-request. Daemon mode therefore
 * NEVER auto-exits by default — it returns an instruction and leaves the process
 * running. Set RULE_MCP_DAEMON_AUTORESTART=1 for single-client daemons that
 * want the old behavior. Stdio installs (client owns/respawns the process) keep
 * auto-restart on.
 *
 * @param {object} r — runSelfUpdate result
 * @param {() => void} [exit] — injectable exit (defaults to process.exit)
 * @returns {string|null}
 */
export function scheduleRestartIfNeeded(r, exit) {
  if (!r?.updated || !r.changedCode) return null;
  if (process.env.RULE_MCP_NO_AUTORESTART === "1") {
    return "Server code changed — restart the server (or reconnect your MCP client) to load it.";
  }
  const isDaemon = process.env.RULE_MCP_DAEMON === "1";
  if (isDaemon && process.env.RULE_MCP_DAEMON_AUTORESTART !== "1") {
    return "Server code changed — restart the daemon to apply it. Auto-restart is off in daemon "
      + "mode to protect other connected clients; set RULE_MCP_DAEMON_AUTORESTART=1 to enable it.";
  }
  const doExit = exit ?? (() => process.exit(0));
  const t = setTimeout(doExit, 800);
  t.unref?.();
  const mode = isDaemon ? "daemon" : "server";
  return `Server code changed — restarting the ${mode} to apply it. Your client will reconnect.`;
}

/**
 * Forced, once-per-process update check. Runs the update, stashes a banner for
 * the router to prepend, and schedules a restart if code changed. Safe to call
 * on every tool invocation — only the first does work.
 *
 * @returns {Promise<void>}
 */
export async function maybeSelfUpdate() {
  if (_checked || !autoUpdateEnabled()) return;
  _checked = true;
  if (!_inflight) _inflight = runSelfUpdate().catch(() => ({ checked: false, updated: false, skipped: true, reason: "error" }));
  const result = await _inflight;
  let banner = buildBanner(result);
  const restartNote = scheduleRestartIfNeeded(result);
  if (restartNote) banner = banner ? `${banner}\n${restartNote}` : `🔄 Updating MCP server — ${restartNote}`;
  if (banner) _pendingBanner = banner;
}

/**
 * Consume the pending update banner (returns it once, then clears it).
 *
 * @returns {string|null}
 */
export function consumeUpdateBanner() {
  const b = _pendingBanner;
  _pendingBanner = null;
  return b;
}

/** Test hook: reset the once-per-process guard. */
export function _resetForTests() {
  _checked = false;
  _inflight = null;
  _pendingBanner = null;
}
