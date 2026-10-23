

/** The decision-cache gate switches: opt-in shadow mode and the provisional floor. */
import { cacheEnabled } from "./_config.js";
import { SHADOW_THRESHOLD } from "./_decision-protocol.js";

/** Shadow mode is opt-in and needs a configured model; replay lands in phase 2. */
export function shadowEnabled(env = process.env) {
  return cacheEnabled() && env.RULE_MCP_DECISION_CACHE_SHADOW === "1" && Boolean(env.RULE_MCP_DECISION_MODEL);
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
