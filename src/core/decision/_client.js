/**
 * @module core/decision/client
 *
 * The loopback-only client for a local llama.cpp decision endpoint.
 *
 * Two calls are enough for the whole decision layer: the model inventory and
 * one `systemsone` request. The client refuses every host but loopback by
 * construction, so a misconfigured URL cannot send prompt text off the machine.
 * It has a hard per-call timeout and no retry: a retried decision would turn one
 * slow forward pass into two and hide the failure the caller has to see.
 */

import { DecisionClientError } from "./_errors.js";
import { requestJson } from "./_request.js";

export { DecisionClientError } from "./_errors.js";

/** The base URL the audit measured. */
export const DEFAULT_BASE_URL = "http://localhost:9931";

/** The per-call ceiling, in milliseconds. A warm decision took about 65 ms. */
export const DEFAULT_TIMEOUT_MS = 5_000;

/** The only hosts a decision endpoint may name. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The only schemes a local endpoint may use. */
const LOOPBACK_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Parse a base URL and prove it points at loopback. No socket is opened.
 *
 * The check runs before `createDecisionClient` builds a caller, so a remote URL
 * fails in the same test that names it, without a server to connect to.
 *
 * @param {string} baseUrl
 * @returns {URL}
 */
export function assertLoopbackUrl(baseUrl) {
  let url;

  try {
    url = new URL(baseUrl);
  } catch {
    throw new DecisionClientError(`invalid decision URL: ${String(baseUrl)}`);
  }

  if (!LOOPBACK_PROTOCOLS.has(url.protocol)) {
    throw new DecisionClientError(`decision endpoint must use http or https, got ${url.protocol}`);
  }

  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new DecisionClientError(`decision endpoint must be loopback (localhost, 127.0.0.1, ::1), got ${url.hostname}`);
  }

  return url;
}

/**
 * Create a client bound to one loopback base URL.
 *
 * @param {{
 *   baseUrl?: string,
 *   timeoutMs?: number,
 *   fetchImpl?: typeof fetch,
 * }} [options]
 * @returns {{
 *   baseUrl: string,
 *   timeoutMs: number,
 *   listModels: () => Promise<any>,
 *   loadModel: (model: string) => Promise<any>,
 *   unloadModel: (model: string) => Promise<any>,
 *   ask: (model: string, state: string, questions: object) => Promise<{ answers: object, usage: object, ms: number }>,
 * }}
 */
export function createDecisionClient(options = {}) {
  const base = assertLoopbackUrl(options.baseUrl ?? DEFAULT_BASE_URL);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new DecisionClientError(`decision timeout must be a positive number, got ${timeoutMs}`);
  }

  if (typeof fetchImpl !== "function") {
    throw new DecisionClientError("decision client needs a fetch implementation");
  }

  /**
   * One JSON round trip on the bound origin.
   *
   * @param {string} path
   * @param {object} [body] omitted for a GET
   */
  async function call(path, body) {
    const url = new URL(path, base);

    if (url.origin !== base.origin) {
      throw new DecisionClientError(`decision path escapes the loopback origin: ${path}`);
    }

    return requestJson({ url, body, timeoutMs, fetchImpl });
  }

  return {
    baseUrl: base.href,
    timeoutMs,
    async listModels() {
      const { json } = await call("/models");

      return json.data ?? json;
    },
    async loadModel(model) {
      const { json } = await call("/models/load", { model });

      return json;
    },
    async unloadModel(model) {
      const { json } = await call("/models/unload", { model });

      return json;
    },
    async ask(model, state, questions) {
      const { json, ms } = await call("/v1/systemone", { model, state, questions });

      return {
        answers: json.answers ?? {},
        usage: json.usage ?? {},
        ms,
      };
    },
  };
}
