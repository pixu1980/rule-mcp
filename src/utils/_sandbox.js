/**
 * @module utils/sandbox
 *
 * Sandbox / resilience layer for rule-mcp.
 * Prevents uncaught errors from crashing the server by wrapping
 * every external operation in safe handlers.
 *
 * Provides:
 * - safeJsonParse - never throws
 * - withTimeout - async timeout guard
 * - trySafe - wraps any function to never throw
 * - wrapRequestHandler - http request handler with timeout + error recovery
 * - installProcessErrorHandlers - catches uncaughtException + unhandledRejection
 */

/**
 * Safely parse JSON, returning undefined on failure.
 *
 * @param {string} text
 * @returns {object|undefined}
 */
export function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return;
  }
}

/**
 * Execute an async function with a timeout.
 *
 * @param {Promise|Function} promiseOrFn
 * @param {number} ms - Timeout in milliseconds
 * @param {string} [label] - For error messages
 * @returns {Promise<any>}
 */
export async function withTimeout(promiseOrFn, ms, label = "operation") {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Sandbox timeout: ${label} exceeded ${ms}ms`));
    }, ms);
  });
  try {
    const value = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;

    return await Promise.race([value, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Wrap any async operation so it NEVER throws.
 * Returns { ok, value } on success, { ok: false, error } on failure.
 *
 * @param {Function|Promise} fn
 * @returns {Promise<{ ok: boolean, value?: any, error?: string }>}
 */
export async function trySafe(fn) {
  try {
    const value = typeof fn === "function" ? await fn() : await fn;

    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error?.message ?? String(error ?? "Unknown error") };
  }
}

/**
 * Wrap an HTTP request handler so it NEVER crashes the server.
 * Catches sync throws, async rejections, adds timeout.
 * Always sends a JSON error response on failure.
 *
 * @param {(req, res) => Promise<void>} handler
 * @param {{ timeout?: number }} [options]
 * @returns {(req, res) => Promise<void>}
 */
export function wrapRequestHandler(handler, options = {}) {
  const timeout = options.timeout ?? 30_000;

  return async (request, res) => {
    // Track if the handler was aborted (timeout)
    let isAborted = false;

    // On timeout or error, destroy the request socket to unblock the handler
    const cleanup = () => {
      isAborted = true;
      try {
        request.destroy();
      } catch {
        /* ignore */
      }
    };

    try {
      await withTimeout(
        Promise.resolve().then(() => handler(request, res)),
        timeout,
        `${request.method} ${request.url}`,
      );

      // Handler didn't send a response - send fallback
      if (!res.writableEnded && !res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json", Connection: "close" });
        res.end(JSON.stringify({ error: "Handler did not send a response" }));
      }
    } catch (error) {
      const message = error?.message ?? String(error ?? "Unknown error");
      const isTimeout = message.startsWith("Sandbox timeout");

      process.stderr.write(
        `[sandbox] ${isTimeout ? "TIMEOUT" : "ERROR"} ${request.method} ${request.url}: ${message}\n`,
      );

      try {
        if (!res.headersSent && !res.writableEnded) {
          const statusCode = isTimeout ? 408 : 500;
          res.writeHead(statusCode, {
            "Content-Type": "application/json",
            Connection: "close", // force close to prevent keep-alive hanging
          });
          // Full detail is already written to stderr above; do not leak it to the client.
          res.end(
            JSON.stringify({
              error: isTimeout ? "Request timed out" : "Internal server error",
            }),
          );
        }
      } catch {
        // Response already ended or errored
      }

      // Destroy the request to unblock the hanging handler
      cleanup();
    }
  };
}

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
