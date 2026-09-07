/** The guarded-check policy: when the worker applies and the per-call budget. */

/** Default per-check budget; RULE_MCP_CHECK_TIMEOUT_MS overrides. */
export const DEFAULT_TIMEOUT_MS = 5000;

/**
 * The worker only earns its cost where a hang is an outage: a long-lived
 * server shared by every client. A CLI one-shot (and every test process) runs
 * inline - spawning a thread that reloads the whole skill set per invocation
 * would be pure overhead. Servers call enableGuardedChecks() at startup.
 */
let _guarded = process.env.RULE_MCP_GUARDED_CHECKS === "1";

/** Route checks through the guarded worker (called by the server entry). */
export function enableGuardedChecks() {
  _guarded = true;
}

/** Whether calls go through the worker path. */
export function guardedEnabled() {
  return _guarded;
}

export function defaultTimeoutMs() {
  const raw = Number(process.env.RULE_MCP_CHECK_TIMEOUT_MS);

  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}
