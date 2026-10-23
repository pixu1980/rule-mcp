

/** The opt-in L3 gate: observe what the decision model would replay, never replay it yet. */
import { evaluateDecision } from "./_decision-evaluate.js";
import { shadowEnabled, shadowThreshold } from "./_decision-gate-env.js";
import { rawRouteOf } from "./_decision-identity.js";
import { promptHash } from "./_decision-protocol.js";
import { recordShadow } from "./_decision-shadow.js";

export { buildDecisionCandidates } from "./_decision-candidates.js";
export { replayEnabled, shadowEnabled, shadowThreshold } from "./_decision-gate-env.js";

function baseRecord(name, prompt, candidates, startedAt) {
  return {
    ts: startedAt,
    tool: name,
    promptHash: promptHash(prompt),
    promptLength: prompt.length,
    candidates: candidates.map(({ label, score, route, deps, key }) => ({
      label,
      score,
      route,
      deps,
      key: String(key).slice(0, 8),
    })),
  };
}

async function runShadow(name, validated, gold) {
  const threshold = shadowThreshold();

  if (!shadowEnabled()) {
    return;
  }

  const startedAt = Date.now();
  const evaluated = await evaluateDecision(name, validated, threshold);

  if (!evaluated) {
    return;
  }

  const base = baseRecord(name, evaluated.prompt, evaluated.candidates, startedAt);
  const hasGold = Boolean(gold?.core);
  const goldRoute = hasGold ? rawRouteOf(gold.core) : null;

  if (evaluated.reason) {
    recordShadow({
      ...base,
      model: evaluated.model?.id ?? null,
      choice: null,
      probability: 0,
      threshold,
      wouldReplay: false,
      reason: evaluated.reason,
      decisionCacheHit: false,
      goldRoute,
      candidateRoute: null,
      correct: null,
      goldMs: gold?.computeMs ?? null,
      ms: Date.now() - startedAt,
    });

    return;
  }

  const decision = evaluated.decision;
  const candidateRoute = decision.candidate?.route ?? null;

  recordShadow({
    ...base,
    model: evaluated.model.id,
    choice: decision.choice,
    probability: decision.probability,
    threshold,
    wouldReplay: decision.wouldReplay,
    reason: decision.reason,
    decisionCacheHit: evaluated.decisionCacheHit,
    goldRoute,
    candidateRoute,
    correct: hasGold && decision.candidate ? candidateRoute === goldRoute : null,
    goldMs: gold?.computeMs ?? null,
    ms: Date.now() - startedAt,
  });
}

const pending = new Set();

/** Start a shadow observation; the caller never awaits it on the response path. */
export function observeDecisionShadow(name, validated, gold = {}) {
  const task = runShadow(name, validated, gold).catch(() => {});

  pending.add(task);
  task.finally(() => pending.delete(task));

  return task;
}

/** Let a test or a report wait for the in-flight observations. */
export async function waitForDecisionShadows() {
  await Promise.allSettled(pending);
}
