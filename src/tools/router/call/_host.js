/**
 * @module tools/router/call/host
 *
 * The host seam for one tool call: what the invocation path may ask of the
 * process hosting it, without importing the module that answers.
 *
 * Several hosts register here - self-update for its throttled check, the
 * branch-sync guard for its staleness notice - so the port holds a list and
 * every host is asked. A single slot would have made the second registrar
 * silently evict the first.
 *
 * The pipeline asks the hosts for two things - kick the per-call work, read the
 * banner they left - and importing each of them to get those puts the router at
 * the bottom of a cycle. Here the pipeline asks the port instead and each host
 * registers itself into it, so the edge runs one way and this module imports
 * nothing.
 */

/** The registered hosts, in registration order. */
let hosts = [];

/**
 * Register one host's hooks for tool calls.
 *
 * Called at import time by each host module, so loading the module is the
 * registration. A call runs every registered `beforeCall` in order, and the
 * banners every host left are joined.
 *
 * @param {{ beforeCall?: (name: string) => void, banner?: () => string|null }} hooks
 */
export function registerCallHost(hooks) {
  hosts.push(hooks);
}

/** Clear every registered host. Tests only. */
export function resetCallHosts() {
  hosts = [];
}

/**
 * Kick each host's pre-call work. The caller decides whether a failure may fail
 * the call: neither a self-update nor a sync check ever does.
 *
 * @param {string} name - the tool about to be called
 */
export function hostBeforeCall(name) {
  for (const host of hosts) {
    host.beforeCall?.(name);
  }
}

/**
 * The banner the hosts want prepended to this reply, or "".
 *
 * @returns {string}
 */
export function hostBanner() {
  return hosts
    .map((host) => host.banner?.() ?? "")
    .filter(Boolean)
    .join("\n\n");
}
