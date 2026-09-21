

/**
 * @module tools/router/call/host
 *
 * The host seam for one tool call: what the invocation path may ask of the
 * process hosting it, without importing the module that answers.
 *
 * The pipeline asks the host for two things - kick the throttled check, read
 * the banner it left - and importing self-update to get them puts the router at
 * the bottom of a five-module cycle: router to self-update to skills to tools
 * to router. Here the pipeline asks a port instead and self-update registers
 * itself into it, so the edge runs one way and this module imports nothing.
 */

let host = {};

/**
 * Register the host hooks for tool calls.
 *
 * Self-update registers itself when it loads. A process that never loads it
 * simply has no kick and no banner, which is the same process that would have
 * had nothing to kick.
 *
 * @param {{ beforeCall?: (name: string) => void, banner?: () => string|null }} hooks
 */
export function registerCallHost(hooks) {
  host = hooks;
}

/**
 * Kick the host's pre-call work, if any. The caller decides whether a failure
 * may fail the call: a self-update check never does.
 *
 * @param {string} name - the tool about to be called
 */
export function hostBeforeCall(name) {
  host.beforeCall?.(name);
}

/**
 * The banner the host wants prepended to this reply, or "".
 *
 * @returns {string}
 */
export function hostBanner() {
  return host.banner?.() ?? "";
}
