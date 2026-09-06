/** @module utils/storm-guard - last-resort process error handlers with a storm cap */

/** The number of swallowed errors inside the window that means a broken process. */
export const STORM_LIMIT = 100;

/** The window the storm limit is counted over. */
export const STORM_WINDOW_MS = 1000;

/**
 * Install process-level error handlers to prevent crashes.
 * Call once at startup.
 *
 * Swallowing an error keeps one bad request from taking the server down. On its
 * own it also keeps a *permanently* broken process running: when the stdio peer
 * is killed the fd errors on every poll, the handler logs to a stderr that is
 * equally broken, and libuv comes straight back with the same error - a loop
 * that costs 100% of a core and achieves nothing.
 *
 * Hence the counter: a hundred swallowed errors inside a second is not a bad
 * request, it is a process that cannot make progress, and the honest response
 * is to exit and let the client respawn. Logging stops first, because writing
 * the diagnostic is part of what spins.
 *
 * @param {{
 *   exit?: (code: number) => void,
 *   now?: () => number,
 *   target?: NodeJS.EventEmitter,
 *   write?: (line: string) => void
 * }} [options] - injected by the tests
 * @returns {void}
 */
export function installProcessErrorHandlers(options = {}) {
  const target = options.target ?? process;
  const exit = options.exit ?? ((code) => process.exit(code));
  const now = options.now ?? (() => Date.now());
  const write = options.write ?? ((line) => process.stderr.write(line));
  let windowStart = now();
  let swallowed = 0;
  let storming = false;

  const record = () => {
    const at = now();

    if (at - windowStart > STORM_WINDOW_MS) {
      windowStart = at;
      swallowed = 0;
    }

    swallowed++;

    if (swallowed < STORM_LIMIT || storming) {
      return storming;
    }

    storming = true;
    exit(70); // EX_SOFTWARE: the process is broken, not the request

    return true;
  };

  const report = (line) => {
    if (record()) {
      return;
    }

    try {
      write(line);
    } catch {
      /* a broken stderr is the storm, not a reason to add to it */
    }
  };

  target.on("uncaughtException", (error, origin) => {
    report(`[sandbox] UNCAUGHT EXCEPTION (${origin}): ${error?.stack ?? error?.message}\n`);
  });

  target.on("unhandledRejection", (reason) => {
    report(`[sandbox] UNHANDLED REJECTION: ${reason?.stack ?? reason}\n`);
  });
}
