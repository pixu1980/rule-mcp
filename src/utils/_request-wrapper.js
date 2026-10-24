/** @module utils/request-wrapper - timeout + error recovery around one HTTP handler */

import { withTimeout } from "./_sandbox.js";

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

      process.stderr.write(`[sandbox] ${isTimeout ? "TIMEOUT" : "ERROR"} ${request.method} ${request.url}: ${message}\n`);

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
