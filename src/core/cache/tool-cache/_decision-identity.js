

/** Stable cache-call identity: non-prompt args, deps digest and candidate text. */
import { createHash } from "node:crypto";

import { redact, truncate } from "./_decision-protocol.js";
import { stableStringify } from "./_keys.js";
import { NORMALIZABLE } from "./_state.js";

const PROMPT_CHAR_CAP = 160;
const ROUTE_CHAR_CAP = 80;

/** The call identity without the prompt-shaped fields, stable across key order. */
export function nonPromptArgs(toolName, args) {
  const fields = NORMALIZABLE.get(toolName) ?? new Set();
  const out = {};

  for (const key of Object.keys(args ?? {}).sort()) {
    if (!fields.has(key) && args[key] !== undefined) {
      out[key] = args[key];
    }
  }

  return stableStringify(out);
}

/** A short digest of the skill digests an entry depends on. */
export function depsFingerprint(deps) {
  return createHash("sha256")
    .update(stableStringify(deps ?? {}))
    .digest("hex")
    .slice(0, 8);
}

/** A stable candidate description: no hits, no age, no result text. */
export function describeCandidate({ key, prompt, route, deps }) {
  const parts = [`request: ${truncate(redact(prompt), PROMPT_CHAR_CAP)}`];

  if (route) {
    parts.push(`skill: ${truncate(redact(route), ROUTE_CHAR_CAP)}`);
  }

  if (deps) {
    parts.push(`deps: ${deps}`);
  }

  if (key) {
    parts.push(`id: ${String(key).slice(0, 8)}`);
  }

  return parts.join("; ");
}

/** Deterministic string order; never a locale. */
export function compare(left, right) {
  const a = String(left ?? "");
  const b = String(right ?? "");

  return a < b ? -1 : a > b ? 1 : 0;
}

/** The raw route field, including "none", for the replay label oracle. */
export function rawRouteOf(result) {
  try {
    const parsed = JSON.parse(result?.content?.[0]?.text ?? "{}");

    return typeof parsed.route === "string" ? parsed.route : undefined;
  } catch {
    return;
  }
}

/** The route a cached result can answer with; "none" is not a candidate. */
export function routeOf(result) {
  const route = rawRouteOf(result);

  return route && route !== "none" ? route : undefined;
}
