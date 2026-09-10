

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
