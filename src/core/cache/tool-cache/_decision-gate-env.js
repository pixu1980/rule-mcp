/** The decision-cache gate switches: opt-in shadow, opt-in replay, and the floor. */
import { cacheEnabled } from "./_config.js";
import { SHADOW_THRESHOLD } from "./_decision-protocol.js";

/** The gate needs a usable cache and a configured model. */
export function decisionEnabled(env = process.env) {
  return cacheEnabled() && Boolean(env.RULE_MCP_DECISION_MODEL);
}

/** Replay is opt-in and never the default; the shadow report is its gate. */
export function replayEnabled(env = process.env) {
  return decisionEnabled(env) && env.RULE_MCP_DECISION_CACHE_REPLAY === "1";
}

/** Shadow mode is opt-in; replay wins when both flags are set. */
export function shadowEnabled(env = process.env) {
  return decisionEnabled(env) && env.RULE_MCP_DECISION_CACHE_SHADOW === "1" && !replayEnabled(env);
}

/** The provisional replay floor; an invalid value falls back to the default. */
export function shadowThreshold(env = process.env) {
  const raw = env.RULE_MCP_DECISION_CACHE_THRESHOLD;

  if (raw === undefined || raw === "") {
    return SHADOW_THRESHOLD;
  }

  const value = Number(raw);

  return Number.isFinite(value) && value > 0 && value <= 1 ? value : SHADOW_THRESHOLD;
}
