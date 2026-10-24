/** Deterministic cache candidates: eligibility, dedupe and BM25 ranking. */
import { depsFingerprint, describeCandidate, nonPromptArgs, routeOf } from "./_decision-identity.js";
import { rankCandidates } from "./_decision-ranker.js";
import { dependenciesHold } from "./_digests.js";
import { echoesArguments } from "./_echo.js";
import { stableStringify } from "./_keys.js";
import { promptOf } from "./_nyx-annotate.js";
import { entriesStore } from "./_persistence.js";
import { NORMALIZABLE } from "./_state.js";

export { depsFingerprint, describeCandidate, nonPromptArgs } from "./_decision-identity.js";

function eligible(toolName, entry, liveArgs) {
  return (
    entry.tool === toolName &&
    entry.result &&
    !entry.result.isError &&
    dependenciesHold(entry.deps) &&
    !echoesArguments(toolName, entry.args, entry.result) &&
    nonPromptArgs(toolName, entry.args) === liveArgs
  );
}

/** Filter, dedupe and rank the cached calls that could answer the live query. */
export function buildDecisionCandidates(toolName, args) {
  if (!NORMALIZABLE.has(toolName)) {
    return [];
  }

  const livePrompt = promptOf(toolName, args);

  if (!livePrompt) {
    return [];
  }

  const liveArgs = nonPromptArgs(toolName, args);
  const seen = new Set();
  const descriptors = [];

  for (const [key, entry] of entriesStore().entries()) {
    if (!eligible(toolName, entry, liveArgs)) {
      continue;
    }

    const prompt = promptOf(toolName, entry.args);
    const route = routeOf(entry.result);

    if (!prompt || !route) {
      continue;
    }

    const signature = `${prompt}\u0000${stableStringify(entry.args ?? {})}`;

    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    descriptors.push({
      key,
      prompt,
      route,
      deps: depsFingerprint(entry.deps),
      argsKey: liveArgs,
      echo: false,
      fresh: true,
      isError: false,
    });
  }

  return rankCandidates(livePrompt, descriptors).map((candidate, index) => ({
    ...candidate,
    label: `candidate-${index + 1}`,
    description: describeCandidate(candidate),
  }));
}
