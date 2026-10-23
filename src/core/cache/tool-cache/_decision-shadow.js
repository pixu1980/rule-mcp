

/** The local JSONL record of what the decision-cache gate would replay. */
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

import { cacheFile } from "./_config.js";

/** The shadow report lives beside the tool-cache file, in the state directory. */
export function shadowFile() {
  return join(dirname(cacheFile()), "decision-shadow.jsonl");
}

/** Append one shadow record. A metric is never worth breaking the call. */
export function recordShadow(event) {
  try {
    const file = shadowFile();

    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify(event)}\n`);
  } catch {
    /* a shadow metric is never worth an outage */
  }
}

/** Read the records back for the report and the tests. */
export function readShadows() {
  try {
    if (!existsSync(shadowFile())) {
      return [];
    }

    return readFileSync(shadowFile(), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/** Drop the shadow history; the next observation starts clean. */
export function clearShadows() {
  try {
    rmSync(shadowFile(), { force: true });
  } catch {
    /* nothing to clear is not a failure */
  }
}

/**
 * Fold the records into the numbers the replay decision needs: false replays at
 * the current floor, the labels the gold route could confirm, and the lowest
 * threshold that stays wrong-free with enough predictions.
 *
 * @param {Array<object>} events
 * @param {{ minPredictions?: number }} [options]
 * @returns {object}
 */
export function summarizeShadows(events, { minPredictions = 10 } = {}) {
  const predictions = events.filter((event) => event.choice && event.choice !== "none" && typeof event.probability === "number");
  const labeled = predictions.filter((event) => event.correct === true || event.correct === false);
  const would = events.filter((event) => event.wouldReplay);
  const reasons = new Map();

  for (const event of events) {
    reasons.set(event.reason, (reasons.get(event.reason) ?? 0) + 1);
  }

  const thresholds = [];

  for (let step = 0.3; step <= 0.99; step += 0.05) {
    const threshold = Math.round(step * 100) / 100;
    const at = labeled.filter((event) => event.probability >= threshold);
    const wrong = at.filter((event) => event.correct === false).length;

    thresholds.push({
      threshold,
      predicted: at.length,
      wrong,
      precision: at.length === 0 ? null : 1 - wrong / at.length,
    });
  }

  const mean = (values) => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);
  const modeled = events.filter((event) => event.model && typeof event.ms === "number");

  return {
    total: events.length,
    wouldReplay: would.length,
    currentWrong: would.filter((event) => event.correct === false).length,
    labeled: labeled.length,
    unlabeled: predictions.length - labeled.length,
    cacheHits: events.filter((event) => event.decisionCacheHit).length,
    meanMs: mean(modeled.map((event) => event.ms)),
    meanGoldMs: mean(modeled.map((event) => event.goldMs).filter((value) => typeof value === "number")),
    reasons: Object.fromEntries(reasons),
    thresholds,
    recommended: thresholds.find((row) => row.wrong === 0 && row.predicted >= minPredictions) ?? null,
  };
}
