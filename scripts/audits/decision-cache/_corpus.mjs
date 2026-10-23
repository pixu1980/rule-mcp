

/** The deterministic plan behind the decision-cache corpus benchmark. */
import { CACHE_GROUPS as GROUPS_1, CACHE_NEGATIVES as NEGATIVES_1 } from "../../../tests/fixtures/decision-cache-corpus.mjs";
import { CACHE_GROUPS as GROUPS_2, CACHE_NEGATIVES as NEGATIVES_2 } from "../../../tests/fixtures/decision-cache-corpus-2.mjs";
import { CACHE_GROUPS as GROUPS_3, CACHE_NEGATIVES as NEGATIVES_3 } from "../../../tests/fixtures/decision-cache-corpus-3.mjs";
import { CACHE_HISTORY } from "../../../tests/fixtures/decision-cache-history.mjs";

/** All three slices are one corpus: the plan and the validator see the merge. */
export const CACHE_GROUPS = [...GROUPS_1, ...GROUPS_2, ...GROUPS_3];
/** The merged unseeded negatives. */
export const CACHE_NEGATIVES = [...NEGATIVES_1, ...NEGATIVES_2, ...NEGATIVES_3];

/**
 * Build the leave-one-out plan: for each prompt in a group, the cache holds the
 * group's other prompts, the group's historical paraphrases and the other
 * groups' seeds. The negatives keep the one-seed-per-group cache, so a missing
 * route stays a safe miss.
 *
 * @returns {{
 *   history: Array<{ group: string, prompt: string }>,
 *   prompts: string[],
 *   seeds: Array<{ group: string, prompt: string }>,
 *   samples: Array<{ group: string, kind: string, prompt: string, seeds: Array<{ group: string, prompt: string }> }>,
 * }}
 */
export function planCorpus() {
  const seeds = CACHE_GROUPS.map(({ id, seed }) => ({ group: id, prompt: seed }));
  const groupPrompts = CACHE_GROUPS.flatMap((group) => [group.seed, ...group.paraphrases]);
  const prompts = [...groupPrompts, ...CACHE_HISTORY.map((item) => item.prompt)];
  const historyByGroup = Map.groupBy(CACHE_HISTORY, (item) => item.group);
  const samples = [];

  for (const group of CACHE_GROUPS) {
    const peers = [group.seed, ...group.paraphrases];

    for (const prompt of peers) {
      samples.push({
        group: group.id,
        kind: "loo",
        prompt,
        seeds: [
          ...seeds.filter((seed) => seed.group !== group.id),
          ...peers.filter((peer) => peer !== prompt).map((peer) => ({ group: group.id, prompt: peer })),
          ...(historyByGroup.get(group.id) ?? []),
        ],
      });
    }
  }

  for (const negative of CACHE_NEGATIVES) {
    samples.push({ group: negative.id, kind: "negative", prompt: negative.prompt, seeds: [...seeds, ...CACHE_HISTORY] });
  }

  return { history: CACHE_HISTORY, prompts, seeds, samples };
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

  for (const item of CACHE_HISTORY) {
    if (CACHE_GROUPS.every((group) => group.id !== item.group)) {
      return `unknown history group: ${item.group}`;
    }

    if (!item.prompt?.trim()) {
      return `empty history prompt: ${item.group}`;
    }

    if (prompts.has(item.prompt)) {
      return `duplicate prompt: ${item.prompt}`;
    }

    prompts.add(item.prompt);
  }

  return null;
}
