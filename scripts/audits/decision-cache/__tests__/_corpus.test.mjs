

/** The leave-one-out corpus shape: unique prompts, peer seeds, real negatives. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { CACHE_GROUPS, CACHE_NEGATIVES, planCorpus, validateCorpus } from "../_corpus.mjs";

test("the leave-one-out corpus is valid, unique and seeds the group peers", () => {
  assert.equal(validateCorpus(), null);

  const { prompts, seeds, samples } = planCorpus();
  const groupPrompts = CACHE_GROUPS.reduce((count, group) => count + 1 + group.paraphrases.length, 0);
  const loo = samples.filter((sample) => sample.kind === "loo");

  assert.equal(prompts.length, groupPrompts);
  assert.equal(seeds.length, CACHE_GROUPS.length);
  assert.equal(loo.length, groupPrompts);
  assert.equal(samples.length, groupPrompts + CACHE_NEGATIVES.length);
  assert.equal(new Set(samples.map((sample) => sample.prompt)).size, samples.length);
  assert.equal(
    samples.every((sample) => sample.group && sample.prompt && sample.seeds.length > 0),
    true,
  );

  const sample = loo.find((item) => item.group === CACHE_GROUPS[0].id);

  assert.equal(
    sample.seeds.some((seed) => seed.group === sample.group && seed.prompt === sample.prompt),
    false,
  );
  assert.equal(
    sample.seeds.some((seed) => seed.group === sample.group && seed.prompt !== sample.prompt),
    true,
  );
  assert.equal(
    sample.seeds.some((seed) => seed.group !== sample.group),
    true,
  );
});

test("every group contributes all its prompts, and each negative seeds the group seeds", () => {
  const { seeds, samples } = planCorpus();

  for (const group of CACHE_GROUPS) {
    for (const prompt of [group.seed, ...group.paraphrases]) {
      assert.equal(
        samples.some((sample) => sample.kind === "loo" && sample.group === group.id && sample.prompt === prompt),
        true,
      );
    }
  }

  for (const negative of CACHE_NEGATIVES) {
    const sample = samples.find((item) => item.kind === "negative" && item.group === negative.id);

    assert.deepEqual(sample.seeds, seeds);
  }
});
