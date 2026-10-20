

/**
 * @module scripts/audits/decision-models/client
 *
 * The two calls this audit needs from a llama.cpp router: what it has, and one
 * decision request.
 *
 * `/v1/systemone` is POST-only, so a GET answering 404 says nothing about
 * whether the build supports decision models. Loading and unloading live in
 * `_models.mjs`, because a router answers before the transition it was asked
 * for has finished and measuring it is a concern of its own.
 */

/** The router under test. */
export const BASE = process.env.RULE_MCP_DECISION_URL ?? "http://localhost:9931";

/** The ceiling for one HTTP call, in milliseconds, from `RULE_MCP_DECISION_TIMEOUT`. */
export const TIMEOUT_MS = Number(process.env.RULE_MCP_DECISION_TIMEOUT ?? 300_000);

/**
 * One JSON round trip, with the wall time it took.
 *
 * @param {string} path
 * @param {object} [body] omitted for a GET
 * @returns {Promise<{ json: any, ms: number, status: number }>}
 */
export async function call(path, body) {
  const started = performance.now();
  const response = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  const ms = performance.now() - started;

  if (!response.ok) {
    throw new Error(`${path} answered ${response.status}: ${text.slice(0, 400)}`);
  }

  return { json: JSON.parse(text), ms, status: response.status };
}

/** Every model the router knows, loaded or not. */
export async function listModels() {
  const { json } = await call("/models");

  return json.data ?? json;
}

/**
 * One decision request: a state and a map of questions.
 *
 * @param {string} model
 * @param {string} state
 * @param {object} questions
 * @returns {Promise<{ answers: object, usage: object, ms: number }>}
 */
export async function ask(model, state, questions) {
  const { json, ms } = await call("/v1/systemone", { model, state, questions });

  return { answers: json.answers ?? {}, usage: json.usage ?? {}, ms };
}
