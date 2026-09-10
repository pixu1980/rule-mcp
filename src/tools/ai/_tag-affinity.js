

import { STOPWORDS } from "./_stopwords.data.js";

/** How much the prompt names one of the skill's tags. */
export function tagAffinity(meta, promptWords) {
  const tags = new Set((meta?.tags ?? []).map((tag) => String(tag).toLowerCase()));

  if (tags.size === 0) {
    return 0;
  }

  let score = 0;

  for (const word of promptWords) {
    if (word.length < 3 || STOPWORDS.has(word)) {
      continue;
    }

    if (tags.has(word)) {
      score += 3;
    }
  }

  return score;
}
