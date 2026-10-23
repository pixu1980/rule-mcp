

/** The deterministic plan behind the decision-cache corpus benchmark. */
import { CACHE_GROUPS, CACHE_NEGATIVES } from "../../../tests/fixtures/decision-cache-corpus.mjs";

/**
 * Build the leave-one-out plan: for each prompt in a group, the cache holds the
 * group's other prompts plus the other groups' seeds. The negatives keep the
 * one-seed-per-group cache, so a missing route stays a safe miss.
 *
 * @returns {{
 *   prompts: string[],
 *   seeds: Array<{ group: string, prompt: string }>,
 *   samples: Array<{ group: string, kind: string, prompt: string, seeds: Array<{ group: string, prompt: string }> }>,
 * }}
 */
export function planCorpus() {
  const seeds = CACHE_GROUPS.map(({ id, seed }) => ({ group: id, prompt: seed }));
  const prompts = CACHE_GROUPS.flatMap((group) => [group.seed, ...group.paraphrases]);
  const samples = [];

  for (const group of CACHE_GROUPS) {
    const peers = [group.seed, ...group.paraphrases];

    for (const prompt of peers) {
      samples.push({
        group: group.id,
        kind: "loo",
        prompt,
        seeds: [...seeds.filter((seed) => seed.group !== group.id), ...peers.filter((peer) => peer !== prompt).map((peer) => ({ group: group.id, prompt: peer }))],
      });
    }
  }

  for (const negative of CACHE_NEGATIVES) {
    samples.push({ group: negative.id, kind: "negative", prompt: negative.prompt, seeds });
  }

  return { prompts, seeds, samples };
}

/** One error string, or null when the corpus is safe to run. */
export function validateCorpus() {
  const ids = new Set();
  const prompts = new Set();

  for (const group of CACHE_GROUPS) {
    if (ids.has(group.id)) {
      return `duplicate id: ${group.id}`;
    }

    ids.add(group.id);

    if (!group.seed?.trim()) {
      return `empty seed: ${group.id}`;
    }

    if (!Array.isArray(group.paraphrases) || group.paraphrases.length === 0) {
      return `no paraphrases: ${group.id}`;
    }

    for (const prompt of [group.seed, ...group.paraphrases]) {
      if (prompts.has(prompt)) {
        return `duplicate prompt: ${prompt}`;
      }

      prompts.add(prompt);
    }
  }

  for (const negative of CACHE_NEGATIVES) {
    if (ids.has(negative.id)) {
      return `duplicate id: ${negative.id}`;
    }

    ids.add(negative.id);

    if (!negative.prompt?.trim()) {
      return `empty negative: ${negative.id}`;
    }

    if (prompts.has(negative.prompt)) {
      return `duplicate prompt: ${negative.prompt}`;
    }

    prompts.add(negative.prompt);
  }

  return null;
}
