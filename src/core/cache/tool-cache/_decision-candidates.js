

/** Deterministic cache candidates: eligibility, dedupe and IDF-weighted ranking. */
import { tokenize } from "../../bm25/_terms.js";
import { compare, depsFingerprint, describeCandidate, nonPromptArgs, routeOf } from "./_decision-identity.js";
import { dependenciesHold } from "./_digests.js";
import { echoesArguments } from "./_echo.js";
import { stableStringify } from "./_keys.js";
import { promptOf } from "./_nyx-annotate.js";
import { entriesStore } from "./_persistence.js";
import { NORMALIZABLE } from "./_state.js";

export { depsFingerprint, describeCandidate, nonPromptArgs } from "./_decision-identity.js";

/** Five candidates plus none keep the choice inside the model's measured cap. */
export const CANDIDATE_CAP = 5;

/** IDF-weighted term overlap, deterministic and bounded by the candidate set. */
export function rankCandidates(query, descriptors, cap = CANDIDATE_CAP) {
  const queryTerms = [...new Set(tokenize(query))];

  if (queryTerms.length === 0) {
    return [];
  }

  const docs = [];

  for (const descriptor of descriptors) {
    const terms = new Set(tokenize(descriptor.prompt ?? ""));

    if (terms.size > 0) {
      docs.push({ ...descriptor, terms });
    }
  }

  if (docs.length === 0) {
    return [];
  }

  const df = new Map();

  for (const doc of docs) {
    for (const term of doc.terms) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const total = docs.length;

  return docs
    .map((doc) => {
      let dot = 0;

      for (const term of queryTerms) {
        if (doc.terms.has(term)) {
          dot += Math.log(1 + total / (1 + (df.get(term) ?? 0)));
        }
      }

      return { ...doc, score: Math.round((dot / Math.sqrt(queryTerms.length * doc.terms.size)) * 1000) / 1000 };
    })
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score || compare(a.key, b.key) || compare(a.prompt, b.prompt))
    .slice(0, cap);
}

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
