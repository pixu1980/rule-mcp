

/**
 * @module core/decision/request
 *
 * One JSON round trip on an already-validated loopback URL.
 *
 * The caller owns the URL invariant; this module owns the timeout and the
 * error shape. There is no retry: a retried decision would pay the forward
 * pass twice and hide the failure the caller has to see.
 */

import { DecisionClientError } from "./_errors.js";

/**
 * @param {{
 *   url: URL,
 *   body?: object,
 *   timeoutMs: number,
 *   fetchImpl: typeof fetch,
 * }} options
 * @returns {Promise<{ json: any, ms: number, status: number }>}
 */
export async function requestJson({ url, body, timeoutMs, fetchImpl }) {
  const started = performance.now();
  let response;

  try {
    response = await fetchImpl(url, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new DecisionClientError(`decision request timed out after ${timeoutMs} ms`, { cause: error });
    }

    throw new DecisionClientError(`decision request failed: ${error?.message ?? String(error)}`, { cause: error });
  }

  const text = await response.text();
  const ms = performance.now() - started;

  if (!response.ok) {
    throw new DecisionClientError(`${url.pathname} answered ${response.status}: ${text.slice(0, 400)}`);
  }

  let json;

  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new DecisionClientError(`${url.pathname} answered non-JSON: ${text.slice(0, 200)}`, { cause: error });
  }

  return { json, ms, status: response.status };
}
