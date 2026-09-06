/** The update scheduler: throttled background checks, the pending banner, restarts. */
import { autoUpdateEnabled, intervalMs } from "./_config.js";
import { runSelfUpdate } from "./_run.js";
import { buildBanner } from "./_banner.js";

/** Timestamp of the last kicked-off check (0 = never). */
export let _lastCheckAt = 0;

/** Single-flight promise so concurrent invocations share one check. */
export let _inflight = null;

/** Banner to prepend to the next tool result (consumed once). */
export let _pendingBanner = null;

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
