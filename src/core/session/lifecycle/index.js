/**
 * One shutdown path, and it always ends in an exit.
 *
 * A server that is asked to stop has to give three things back: the sockets it
 * holds, the children it spawned, and the heap it filled. This module is where
 * everything that needs releasing says so, in one place, so no caller has to
 * remember the whole list.
 *
 * The rule that shapes the code: **a signal handler must never make the process
 * harder to kill.** Every handler here runs the cleanups behind an unref'd
 * deadline and then calls exit unconditionally; a second signal skips the
 * cleanups entirely. Handlers are installed by entrypoints only (serve, the
 * daemon), never at import time by a module the tests load.
 *
 * @see module:server - the stdio entrypoint registers its cleanups here
 * @see module:cli/commands - serveCommand waits on whenShutdown()
 */
export * from "./_state.js";
export * from "./_children.js";
export * from "./_cleanups.js";
export * from "./_signals.js";

import { resetChildren } from "./_children.js";
import { clearCleanups } from "./_cleanups.js";
import { resetState } from "./_state.js";
import { clearInstalled } from "./_signals.js";

/**
 * Forget every cleanup, child, handler and shutdown flag.
 *
 * For the tests, and for a CLI process that starts a second server in-process
 * after stopping the first.
 */
export function resetLifecycle() {
  clearInstalled();
  clearCleanups();
  resetChildren();
  resetState();
}
