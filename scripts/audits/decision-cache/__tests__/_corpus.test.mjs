

/** The paraphrase corpus shape: unique prompts, a seed per group, real negatives. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { CACHE_GROUPS, CACHE_NEGATIVES } from "../../../../tests/fixtures/decision-cache-corpus.mjs";
import { planCorpus, validateCorpus } from "../_corpus.mjs";

test("the corpus is valid, unique and covers groups plus negatives", () => {
  assert.equal(validateCorpus(), null);

  const { seeds, samples } = planCorpus();
  const paraphrases = CACHE_GROUPS.reduce((count, group) => count + group.paraphrases.length, 0);

  assert.equal(seeds.length, CACHE_GROUPS.length);
  assert.equal(samples.length, paraphrases + CACHE_NEGATIVES.length);
  assert.equal(new Set(seeds.map((seed) => seed.prompt)).size, seeds.length);
  assert.equal(new Set(samples.map((sample) => sample.prompt)).size, samples.length);
  assert.equal(
    samples.some((sample) => sample.kind === "negative"),
    true,
  );
  assert.equal(
    samples.every((sample) => sample.group && sample.prompt),
    true,
  );
});

test("every group has a seed and contributes a paraphrase", () => {
  const { seeds, samples } = planCorpus();

  for (const group of CACHE_GROUPS) {
    assert.equal(
      seeds.some((seed) => seed.group === group.id && seed.prompt === group.seed),
      true,
    );
    assert.equal(
      samples.some((sample) => sample.group === group.id && sample.kind === "paraphrase"),
      true,
    );
  }
});
