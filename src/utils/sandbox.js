/**
 * @module utils/sandbox
 *
 * Sandbox / resilience layer for rule-mcp.
 * Prevents uncaught errors from crashing the server by wrapping
 * every external operation in safe handlers.
 *
 * Provides:
 * - safeJsonParse — never throws
 * - withTimeout — async timeout guard
 * - trySafe — wraps any function to never throw
 * - wrapRequestHandler — http request handler with timeout + error recovery
 * - installProcessErrorHandlers — catches uncaughtException + unhandledRejection
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
    return undefined;
  }
}

/**
 * Execute an async function with a timeout.
 *
 * @param {Promise|Function} promiseOrFn
 * @param {number} ms — Timeout in milliseconds
 * @param {string} [label] — For error messages
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
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err ?? "Unknown error") };
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
  const timeout = options.timeout ?? 30000;

  return async (req, res) => {
    // Track if the handler was aborted (timeout)
    let aborted = false;

    // On timeout or error, destroy the request socket to unblock the handler
    const cleanup = () => {
      aborted = true;
      try { req.destroy(); } catch { /* ignore */ }
    };

    try {
      await withTimeout(
        Promise.resolve().then(() => handler(req, res)),
        timeout,
        `${req.method} ${req.url}`
      );

      // Handler didn't send a response — send fallback
      if (!res.writableEnded && !res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json", "Connection": "close" });
        res.end(JSON.stringify({ error: "Handler did not send a response" }));
      }
    } catch (err) {
      const message = err?.message ?? String(err ?? "Unknown error");
      const isTimeout = message.startsWith("Sandbox timeout");

      process.stderr.write(`[sandbox] ${isTimeout ? "TIMEOUT" : "ERROR"} ${req.method} ${req.url}: ${message}\n`);

      try {
        if (!res.headersSent && !res.writableEnded) {
          const statusCode = isTimeout ? 408 : 500;
          res.writeHead(statusCode, {
            "Content-Type": "application/json",
            "Connection": "close", // force close to prevent keep-alive hanging
          });
          // Full detail is already written to stderr above; do not leak it to the client.
          res.end(JSON.stringify({
            error: isTimeout ? "Request timed out" : "Internal server error",
          }));
        }
      } catch {
        // Response already ended or errored
      }

      // Destroy the request to unblock the hanging handler
      cleanup();
    }
  };
}

/**
 * Install process-level error handlers to prevent crashes.
 * Call once at startup.
 */
export function installProcessErrorHandlers() {
  process.on("uncaughtException", (err, origin) => {
    process.stderr.write(`[sandbox] UNCAUGHT EXCEPTION (${origin}): ${err.stack ?? err.message}\n`);
  });

  process.on("unhandledRejection", (reason) => {
    process.stderr.write(`[sandbox] UNHANDLED REJECTION: ${reason?.stack ?? reason}\n`);
  });
}
