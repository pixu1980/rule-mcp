/**
 * @module core/self-update
 *
 * Forced self-update for local git-clone installs. On every tool invocation the
 * server checks for upstream updates (throttled: the actual fetch runs at most
 * once per RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS, default 60s), fast-forwards
 * if behind, hot-reloads skills, and - when server CODE changed - schedules a
 * restart so the update takes effect. The check is fire-and-forget: the tool
 * responds immediately and a banner is prepended to a later result. It is
 * visible to the user and forced, but always fail-open: any error, offline
 * network, dirty tree, missing upstream, or non-git install skips silently and
 * the user's actual call proceeds on the current version.
 *
 * Safety:
 *   - the upstream remote must be an ALLOWED remote (see resolveAllowedRemotes):
 *     fetching and merging is code execution, so where the code comes from is
 *     verified before anything is merged
 *   - fast-forward only (`git merge --ff-only`) - never discards local work
 *   - skipped when the working tree is dirty, HEAD is detached, or no upstream
 *   - RULE_MCP_UPDATE_REMOTE overrides the allowed remote(s) (comma-separated)
 *   - RULE_MCP_UPDATE_REQUIRE_SIGNATURE=1 additionally requires a valid
 *     signature on the upstream commit
 *   - RULE_MCP_NO_AUTOUPDATE=1 disables the check
 *   - RULE_MCP_NO_AUTORESTART=1 keeps the process alive on code changes
 *
 * @see module:cli/paths - getRepoRoot, detectInstallType
 * @see module:core/skills - loadAllSkills(true) hot-reload
 */

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
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

  if (raw === undefined || raw === "") {
    return DEFAULT_INTERVAL_MS;
  }

  const n = Number(raw);

  if (!Number.isFinite(n) || n < 0) {
    return DEFAULT_INTERVAL_MS;
  }

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

/**
 * Reduce a git remote to a comparable identity: host + path, without scheme,
 * credentials, port, `.git` suffix, or trailing slash.
 *
 * git accepts several spellings of the same repository - this project's own
 * remote is scp-style SSH while server.json declares the HTTPS form - so a
 * string compare would reject the legitimate case and teach everyone to disable
 * the check. Returns null for anything unusable, which matches nothing.
 *
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function normalizeRemoteUrl(url) {
  if (typeof url !== "string") {
    return null;
  }

  let value = url.trim();

  if (value === "") {
    return null;
  }

  // Local paths (used by tests and by clone-of-a-clone installs) have no host.
  if (value.startsWith("/") || value.startsWith(".") || value.startsWith("file://")) {
    return value.replace(/^file:\/\//, "").replace(/\/+$/, "") || null;
  }

  // scp-style: git@host:owner/repo.git → host/owner/repo
  const scp = value.match(/^(?:[^@/]+@)?([^/:]+):(?!\/)(.+)$/);
  value = scp ? `${scp[1]}/${scp[2]}` : value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^[^@/]+@/, "");

  // Strip a port on the host segment, then the .git suffix and trailing slashes.
  const [host, ...rest] = value.split("/");
  const path = rest
    .join("/")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  const identity = `${host.replace(/:\d+$/, "").toLowerCase()}/${path}`;

  return identity === "/" ? null : identity;
}

/** Repository declared by the shipped server.json, or null when unreadable. */
function declaredRepository() {
  try {
    const manifest = JSON.parse(readFileSync(new URL("../../server.json", import.meta.url), "utf8"));

    return manifest?.repository?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * The remotes this install may take code from.
 *
 * Precedence: an explicit RULE_MCP_UPDATE_REMOTE (comma-separated) REPLACES
 * the default - a fork or a test sandbox names its own upstream - otherwise the
 * repository declared in the shipped server.json is the only trusted source.
 * There is deliberately no trust-on-first-use fallback: pinning whatever the
 * remote happens to say would trust whoever edited .git/config first.
 *
 * @param {Record<string, string|undefined>} [environment]
 * @returns {string[]} normalized remote identities (possibly empty)
 */
export function resolveAllowedRemotes(environment = process.env) {
  const override = environment.RULE_MCP_UPDATE_REMOTE;
  const sources = override ? override.split(",") : [declaredRepository()];

  return sources.map((source) => normalizeRemoteUrl(source)).filter(Boolean);
}

/** Manual update command hint for install types we cannot auto-update. */
function manualHint(type) {
  if (type === "npm") {
    return "Update with: pnpm add -g rule-mcp@latest (then restart the server).";
  }

  if (type === "docker") {
    return "Update with: docker compose pull && docker compose up -d.";
  }

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

  if (!autoUpdateEnabled()) {
    return { checked: false, updated: false, skipped: true, reason: "disabled" };
  }

  const type = detectInstallType();

  if (type !== "git") {
    return { checked: true, updated: false, skipped: true, reason: type, note: manualHint(type) };
  }

  const root = getRepoRoot();

  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"], root);

  if (!branch || branch === "HEAD") {
    return { checked: true, updated: false, skipped: true, reason: "detached-head" };
  }

  const upstream = await git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], root);

  if (!upstream) {
    return { checked: true, updated: false, skipped: true, reason: "no-upstream" };
  }

  // ── Where the code comes from, verified BEFORE any fetch or merge ──
  // A fetch + ff-merge + restart is remote code execution. One line rewritten in
  // .git/config would otherwise be enough to own the server at the next tool call.
  const remoteName = upstream.includes("/") ? upstream.slice(0, upstream.indexOf("/")) : "origin";
  const remoteUrl = await git(["remote", "get-url", remoteName], root);
  const allowed = resolveAllowedRemotes();
  const identity = normalizeRemoteUrl(remoteUrl);

  if (allowed.length === 0) {
    return { checked: true, updated: false, skipped: true, reason: "no-allowed-remote", remote: remoteUrl ?? null };
  }

  if (!identity || !allowed.includes(identity)) {
    return { checked: true, updated: false, skipped: true, reason: "remote-not-allowed", remote: remoteUrl ?? null };
  }

  // Only TRACKED modifications block a fast-forward; untracked artifacts
  // (.tokensave/, build output, caches) are irrelevant to ff safety.
  const dirty = await git(["status", "--porcelain", "--untracked-files=no"], root);

  if (dirty === null) {
    return { checked: true, updated: false, skipped: true, reason: "git-error" };
  }

  if (dirty.length > 0) {
    return { checked: true, updated: false, skipped: true, reason: "dirty-tree" };
  }

  // Fetch (network); fail-open on offline/timeout.
  const fetched = await git(["fetch", "--quiet"], root);

  if (fetched === null) {
    return { checked: true, updated: false, skipped: true, reason: "fetch-failed" };
  }

  const before = await git(["rev-parse", "HEAD"], root);
  const remote = await git(["rev-parse", "@{u}"], root);

  if (!before || !remote) {
    return { checked: true, updated: false, skipped: true, reason: "git-error" };
  }

  if (before === remote) {
    return { checked: true, updated: false };
  }

  // Optional second gate: the upstream commit must carry a valid signature.
  // Off by default - most repositories do not sign, and failing closed would
  // silently stop every update instead of protecting anything.
  if (process.env.RULE_MCP_UPDATE_REQUIRE_SIGNATURE === "1") {
    const verified = await git(["verify-commit", "--raw", remote], root);

    if (verified === null) {
      return { checked: true, updated: false, skipped: true, reason: "unsigned-upstream", to: remote.slice(0, 7) };
    }
  }

  // Fast-forward only - never clobber local commits.
  const merged = await git(["merge", "--ff-only", "@{u}"], root);

  if (merged === null) {
    return { checked: true, updated: false, skipped: true, reason: "not-fast-forward" };
  }

  const after = await git(["rev-parse", "HEAD"], root);

  // `git merge --ff-only <ancestor>` exits 0 with "Already up to date" without
  // moving HEAD, which happens on every check while the local branch is AHEAD of
  // its upstream - the normal state during feature work. Treating that as an
  // update produced a banner claiming the server had just updated itself
  // (`updated 1cb8547→1cb8547 (0 files)`) on every tool call.
  if (!after || after === before) {
    return { checked: true, updated: false };
  }

  // Auditable trail, written only when HEAD actually moved: what was pulled,
  // and from where.
  process.stderr.write(`[rule-mcp] self-update ${before.slice(0, 7)}→${after.slice(0, 7)} from ${remoteUrl}\n`);

  const diff = (await git(["diff", "--name-only", before, after], root)) ?? "";
  const changed = diff.split("\n").filter(Boolean);
  const changedSkills = changed.some((p) => p.startsWith("skills/"));
  const changedCode = changed.some((p) => /^(?:src|bin)\//.test(p) || p === "package.json");

  if (changedSkills && reloadSkills) {
    try {
      const { loadAllSkills } = await import("./skills/_skills.js");
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
 * @param {object} r - runSelfUpdate result
 * @returns {string|null}
 */
export function buildBanner(r) {
  if (!r) {
    return null;
  }

  if (r.updated) {
    const what =
      r.changedSkills && r.changedCode ? "skills + code" : r.changedCode ? "code" : r.changedSkills ? "skills" : "";
    const scope = what ? `${what} file(s)` : "file(s)";
    let message = `🔄 Updating MCP server - rule-mcp updated ${r.from}→${r.to} (${r.count} ${scope}).`;

    if (r.changedSkills) {
      message += " Skills hot-reloaded.";
    }

    return message;
  }
  // A refused remote is never silent: it means this install's upstream is not
  // the one it ships with, which is either a fork that needs configuring or
  // someone repointing the remote at code of their own.
  if (r.reason === "remote-not-allowed") {
    return (
      `⚠️ rule-mcp self-update REFUSED - the git remote (${r.remote ?? "unknown"}) is not an allowed update source. ` +
      "Set RULE_MCP_UPDATE_REMOTE to the upstream you trust, or update manually. No code was fetched."
    );
  }

  if (r.reason === "no-allowed-remote") {
    return (
      "⚠️ rule-mcp self-update REFUSED - no allowed update remote is configured. " +
      "Set RULE_MCP_UPDATE_REMOTE to the upstream you trust. No code was fetched."
    );
  }

  if (r.reason === "unsigned-upstream") {
    return (
      `⚠️ rule-mcp self-update REFUSED - upstream commit ${r.to ?? ""} has no valid signature and ` +
      "RULE_MCP_UPDATE_REQUIRE_SIGNATURE=1. No code was merged."
    );
  }
  // Non-git installs get a one-line hint so the user knows how to update.
  if (r.skipped && r.note) {
    return `ℹ️ rule-mcp is up to date on disk. ${r.note}`;
  }

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
 * A shared daemon serves several clients at once (Pi + VS Code + ...), so a forced
 * exit would drop every other client's session mid-request. Daemon mode therefore
 * NEVER auto-exits by default - it returns an instruction and leaves the process
 * running. Set RULE_MCP_DAEMON_AUTORESTART=1 for single-client daemons that
 * want that behavior. Stdio installs (client owns/respawns the process) keep
 * auto-restart on.
 *
 * @param {object} r - runSelfUpdate result
 * @param {() => void} [exit] - injectable exit (defaults to process.exit)
 * @returns {string|null}
 */
export function scheduleRestartIfNeeded(r, exit) {
  if (!r?.updated || !r.changedCode) {
    return null;
  }

  if (process.env.RULE_MCP_NO_AUTORESTART === "1") {
    return "Server code changed - restart the server (or reconnect your MCP client) to load it.";
  }

  const isDaemon = process.env.RULE_MCP_DAEMON === "1";

  if (isDaemon && process.env.RULE_MCP_DAEMON_AUTORESTART !== "1") {
    return (
      "Server code changed - restart the daemon to apply it. Auto-restart is off in daemon " +
      "mode to protect other connected clients; set RULE_MCP_DAEMON_AUTORESTART=1 to enable it."
    );
  }

  const doExit = exit ?? (() => process.exit(0));
  const t = setTimeout(doExit, 800);
  t.unref?.();
  const mode = isDaemon ? "daemon" : "server";

  return `Server code changed - restarting the ${mode} to apply it. Your client will reconnect.`;
}

/**
 * Throttled, fire-and-forget update check. The router calls this on every tool
 * invocation but real work (git fetch + ff-only merge + skill hot-reload)
 * happens at most once per interval - or on every call with interval 0. The
 * caller may await the returned promise (tests) or ignore it (router: the tool
 * responds immediately and any banner is prepended to a later result).
 *
 * @returns {Promise<object>|undefined} in-flight check promise, or undefined when throttled/disabled
 */
export function maybeSelfUpdate() {
  if (!autoUpdateEnabled()) {
    return;
  }

  if (_inflight) {
    return _inflight;
  } // concurrent invocations share one check
  const throttle = intervalMs();
  const now = Date.now();

  if (throttle !== 0 && now - _lastCheckAt < throttle) {
    return;
  }

  _lastCheckAt = now; // stamp at kickoff so slow checks don't re-trigger
  _inflight = runSelfUpdate()
    .catch(() => ({ checked: false, updated: false, skipped: true, reason: "error" }))
    .then((result) => {
      _inflight = null;
      let banner = buildBanner(result);
      const restartNote = scheduleRestartIfNeeded(result);

      if (restartNote) {
        banner = banner ? `${banner}\n${restartNote}` : `🔄 Updating MCP server - ${restartNote}`;
      }

      if (banner) {
        _pendingBanner = banner;
      }

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
