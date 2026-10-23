

/** The opt-in L3 gate: observe what the decision model would replay, never replay it yet. */
import { decisionCache } from "../../decision/_cache.js";
import { rerankShortlist } from "../../decision/_rerank.js";
import { decisionRuntime, resolveRuntimeModel } from "../../decision/_runtime.js";
import { buildDecisionCandidates, nonPromptArgs } from "./_decision-candidates.js";
import { shadowEnabled, shadowThreshold } from "./_decision-gate-env.js";
import { buildGateQuestion, buildGateState, decideShadow, GATE_INSTRUCTIONS, NONE_DESCRIPTION, NONE_LABEL, promptHash } from "./_decision-protocol.js";
import { recordShadow } from "./_decision-shadow.js";
import { promptOf } from "./_nyx-annotate.js";

export { buildDecisionCandidates } from "./_decision-candidates.js";
export { shadowEnabled, shadowThreshold } from "./_decision-gate-env.js";

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

async function runShadow(name, validated) {
  if (!shadowEnabled()) {
    return;
  }

  const prompt = promptOf(name, validated);

  if (!prompt) {
    return;
  }

  const startedAt = Date.now();
  const candidates = buildDecisionCandidates(name, validated);
  const base = baseRecord(name, prompt, candidates, startedAt);
  const threshold = shadowThreshold();

  if (candidates.length === 0) {
    recordShadow({
      ...base,
      model: null,
      choice: null,
      probability: 0,
      threshold,
      wouldReplay: false,
      reason: "no-candidates",
      decisionCacheHit: false,
      ms: Date.now() - startedAt,
    });

    return;
  }

  const model = resolveRuntimeModel(prompt);

  if (!model) {
    return;
  }

  const state = buildGateState({ toolName: name, args: validated, livePrompt: prompt, candidates });
  const shortlist = candidates.map(({ label, description }) => ({ skill: label, description }));

  shortlist.push({ skill: NONE_LABEL, description: NONE_DESCRIPTION });

  const questions = buildGateQuestion(candidates);
  const key = decisionCache.key({ model: model.id, state, questions });
  const hit = decisionCache.read(key);
  let rerank = hit;

  try {
    if (!rerank) {
      const runtime = await decisionRuntime(prompt);

      if (!runtime) {
        return;
      }

      rerank = await rerankShortlist({
        prompt: state,
        shortlist,
        ask: runtime.supervisor.ask,
        model: runtime.model.id,
        instructions: GATE_INSTRUCTIONS,
      });
    }
  } catch {
    recordShadow({
      ...base,
      model: model.id,
      choice: null,
      probability: 0,
      threshold,
      wouldReplay: false,
      reason: "model-error",
      decisionCacheHit: Boolean(hit),
      ms: Date.now() - startedAt,
    });

    return;
  }

  const decision = decideShadow({
    answer: rerank,
    candidates,
    live: { argsKey: nonPromptArgs(name, validated) },
    threshold,
  });

  recordShadow({
    ...base,
    model: model.id,
    choice: decision.choice,
    probability: decision.probability,
    threshold,
    wouldReplay: decision.wouldReplay,
    reason: decision.reason,
    decisionCacheHit: Boolean(hit),
    ms: Date.now() - startedAt,
  });
}

const pending = new Set();

/** Start a shadow observation; the caller never awaits it on the response path. */
export function observeDecisionShadow(name, validated) {
  const task = runShadow(name, validated).catch(() => {});

  pending.add(task);
  task.finally(() => pending.delete(task));

  return task;
}

/** Let a test or a report wait for the in-flight observations. */
export async function waitForDecisionShadows() {
  await Promise.allSettled(pending);
}
