/**
 * @module core/self-update
 *
 * Forced self-update for local git-clone installs. On every tool invocation the
 * server checks for upstream updates (throttled: the actual fetch runs at most
 * once per RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS, default 60s), fast-forwards
 * if behind, hot-reloads skills, and — when server CODE changed — schedules a
 * restart so the update takes effect. The check is fire-and-forget: the tool
 * responds immediately and a banner is prepended to a later result. It is
 * visible to the user and forced, but always fail-open: any error, offline
 * network, dirty tree, missing upstream, or non-git install skips silently and
 * the user's actual call proceeds on the current version.
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

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getRepoRoot, detectInstallType } from "../cli/paths.js";

/** execFile promisified: resolves { stdout, stderr }. */
const execFileAsync = promisify(execFile);

/** Default throttle between update checks (RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS). */
const DEFAULT_INTERVAL_MS = 60_000;

/** Timestamp of the last kicked-off check (0 = never). */
let _lastCheckAt = 0;
/** Single-flight promise so concurrent invocations share one check. */
let _inflight = null;
/** Banner to prepend to the next tool result (consumed once). */
let _pendingBanner = null;

/** @returns {boolean} */
export function autoUpdateEnabled() {
  return process.env.RULE_MCP_NO_AUTOUPDATE !== "1";
}

/**
 * Parse the throttle interval from the environment.
 * - unset / empty / NaN / negative → 60s (default)
 * - "0" → check on every invocation (no throttle)
 * - positive → seconds (may be fractional)
 *
 * @returns {number} interval in milliseconds
 */
function intervalMs() {
  const raw = process.env.RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS;
  if (raw === undefined || raw === "") {return DEFAULT_INTERVAL_MS;}
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {return DEFAULT_INTERVAL_MS;}
  return n === 0 ? 0 : Math.max(Math.round(n * 1000), 1);
}

/**
 * Run a git command in the repo root; return trimmed stdout or null on failure.
 * Async (never blocks the event loop) so the fire-and-forget check can run in
 * the background without stalling the tool call that triggered it.
 */
async function git(arguments_, root, timeout = 8000) {
  try {
    const { stdout } = await execFileAsync("git", arguments_, {
      cwd: root,
      timeout,
      maxBuffer: 16 * 1024 * 1024,
      encoding: "utf8",
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/** Manual update command hint for install types we cannot auto-update. */
function manualHint(type) {
  if (type === "npm") {return "Update with: pnpm add -g rule-mcp@latest (then restart the server).";}
  if (type === "docker") {return "Update with: docker compose pull && docker compose up -d.";}
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
  if (!autoUpdateEnabled()) {return { checked: false, updated: false, skipped: true, reason: "disabled" };}

  const type = detectInstallType();
  if (type !== "git") {
    return { checked: true, updated: false, skipped: true, reason: type, note: manualHint(type) };
  }

  const root = getRepoRoot();

  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"], root);
  if (!branch || branch === "HEAD") {return { checked: true, updated: false, skipped: true, reason: "detached-head" };}

  const upstream = await git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], root);
  if (!upstream) {return { checked: true, updated: false, skipped: true, reason: "no-upstream" };}

  // Only TRACKED modifications block a fast-forward; untracked artifacts
  // (.tokensave/, build output, caches) are irrelevant to ff safety.
  const dirty = await git(["status", "--porcelain", "--untracked-files=no"], root);
  if (dirty === null) {return { checked: true, updated: false, skipped: true, reason: "git-error" };}
  if (dirty.length > 0) {return { checked: true, updated: false, skipped: true, reason: "dirty-tree" };}

  // Fetch (network); fail-open on offline/timeout.
  const fetched = await git(["fetch", "--quiet"], root);
  if (fetched === null) {return { checked: true, updated: false, skipped: true, reason: "fetch-failed" };}

  const before = await git(["rev-parse", "HEAD"], root);
  const remote = await git(["rev-parse", "@{u}"], root);
  if (!before || !remote) {return { checked: true, updated: false, skipped: true, reason: "git-error" };}
  if (before === remote) {return { checked: true, updated: false };}

  // Fast-forward only — never clobber local commits.
  const merged = await git(["merge", "--ff-only", "@{u}"], root);
  if (merged === null) {return { checked: true, updated: false, skipped: true, reason: "not-fast-forward" };}

  const after = await git(["rev-parse", "HEAD"], root);
  const diff = (await git(["diff", "--name-only", before, after], root)) ?? "";
  const changed = diff.split("\n").filter(Boolean);
  const changedSkills = changed.some((p) => p.startsWith("skills/"));
  const changedCode = changed.some((p) => /^(?:src|bin)\//.test(p) || p === "package.json");

  if (changedSkills && reloadSkills) {
    try {
      const { loadAllSkills } = await import("./skills.js");
      await loadAllSkills(true); // re-register tools + flush skill/result caches
    } catch {
      /* skills reload best-effort */
    }
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
  if (!r) {return null;}
  if (r.updated) {
    const what =
      r.changedSkills && r.changedCode
        ? "skills + code"
        : r.changedCode
          ? "code"
          : r.changedSkills
            ? "skills"
            : "files";
    let message = `🔄 Updating MCP server — rule-mcp updated ${r.from}→${r.to} (${r.count} ${what} file(s)).`;
    if (r.changedSkills) {message += " Skills hot-reloaded.";}
    return message;
  }
  // Non-git installs get a one-line hint so the user knows how to update.
  if (r.skipped && r.note) {return `ℹ️ rule-mcp is up to date on disk. ${r.note}`;}
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
  if (!r?.updated || !r.changedCode) {return null;}
  if (process.env.RULE_MCP_NO_AUTORESTART === "1") {
    return "Server code changed — restart the server (or reconnect your MCP client) to load it.";
  }
  const isDaemon = process.env.RULE_MCP_DAEMON === "1";
  if (isDaemon && process.env.RULE_MCP_DAEMON_AUTORESTART !== "1") {
    return (
      "Server code changed — restart the daemon to apply it. Auto-restart is off in daemon " +
      "mode to protect other connected clients; set RULE_MCP_DAEMON_AUTORESTART=1 to enable it."
    );
  }
  const doExit = exit ?? (() => process.exit(0));
  const t = setTimeout(doExit, 800);
  t.unref?.();
  const mode = isDaemon ? "daemon" : "server";
  return `Server code changed — restarting the ${mode} to apply it. Your client will reconnect.`;
}

/**
 * Throttled, fire-and-forget update check. The router calls this on every tool
 * invocation but real work (git fetch + ff-only merge + skill hot-reload)
 * happens at most once per interval — or on every call with interval 0. The
 * caller may await the returned promise (tests) or ignore it (router: the tool
 * responds immediately and any banner is prepended to a later result).
 *
 * @returns {Promise<object>|undefined} in-flight check promise, or undefined when throttled/disabled
 */
export function maybeSelfUpdate() {
  if (!autoUpdateEnabled()) {return;}
  if (_inflight) {return _inflight;} // concurrent invocations share one check
  const throttle = intervalMs();
  const now = Date.now();
  if (throttle !== 0 && now - _lastCheckAt < throttle) {return;}
  _lastCheckAt = now; // stamp at kickoff so slow checks don't re-trigger
  _inflight = runSelfUpdate()
    .catch(() => ({ checked: false, updated: false, skipped: true, reason: "error" }))
    .then((result) => {
      _inflight = null;
      let banner = buildBanner(result);
      const restartNote = scheduleRestartIfNeeded(result);
      if (restartNote) {banner = banner ? `${banner}\n${restartNote}` : `🔄 Updating MCP server — ${restartNote}`;}
      if (banner) {_pendingBanner = banner;}
      return result;
    });
  return _inflight;
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

/** Test hook: reset throttle/banner state. */
export function _resetForTests() {
  _lastCheckAt = 0;
  _inflight = null;
  _pendingBanner = null;
}
