import { STOPWORDS } from "./_stopwords.data.js";

/** Suffixes that make a word a different form of the same word. */
const INFLECTIONS = new Set(["s", "es", "ed", "ing", "ion", "ions", "er", "ers", "al"]);

/** How much the prompt names this skill (three tiers, same/stem/prefix). */
export function nameAffinity(skillName, promptWords) {
  const parts = skillName
    .replace(/^rule(?:-|$)/, "")
    .split("-")
    .filter((part) => part.length > 2);
  const sameWord = (long, short) => INFLECTIONS.has(long.slice(short.length));
  let score = 0;

  for (const word of promptWords) {
    if (word.length < 3 || STOPWORDS.has(word)) {
      continue;
    }

    for (const part of parts) {
      if (part === word) {
        score += 12;
      } else if (part.startsWith(word) && sameWord(part, word)) {
        score += 12;
      } else if (word.startsWith(part) && sameWord(word, part)) {
        score += 12;
      } else if (part.startsWith(word) || word.startsWith(part)) {
        score += 6;
      }
    }
  }

  return score;
}
