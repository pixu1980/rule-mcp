

/**
 * @module core/text/fillers.data
 *
 * Single words removed outright, each tagged with the lowest intensity level
 * that removes it. Ported from the rule table in `skills/rule-compression/SKILL.md`
 * ("Filler adverbs", "Pleasantries", "Hedging that carries no probability"):
 * filler, hedging and pleasantries are the `lite` contract, so every entry
 * here is `lite`.
 *
 * `pattern` is a regular-expression source, not a literal, because a bare word
 * is not always filler. Each guard below is a measured construct trap, not a
 * precaution: deleting the word inside it changed the meaning of the sentence.
 */

/** @type {Array<{ pattern: string, level: "lite", note?: string }>} */
export const FILLERS = [
  { pattern: "just(?!-)", level: "lite", note: "hyphenated compounds keep it: just-in-time" },
  { pattern: "really", level: "lite" },
  { pattern: "basically", level: "lite" },
  { pattern: "actually", level: "lite" },
  { pattern: "simply", level: "lite" },
  { pattern: String.raw`very(?!\s+(?:least|best|first|last|same|end|beginning|next)\b)`, level: "lite", note: "at the very least keeps its superlative" },
  { pattern: String.raw`quite(?!\s+a\s+few\b)`, level: "lite", note: "quite a few is a phrase meaning many" },
  { pattern: String.raw`rather(?!\s+than\b)`, level: "lite", note: "X rather than Y is a comparative, not filler" },
  { pattern: "essentially", level: "lite" },
  { pattern: "definitely", level: "lite" },
  { pattern: "certainly", level: "lite" },
  { pattern: "obviously", level: "lite" },
  { pattern: "literally", level: "lite" },
  { pattern: "arguably", level: "lite" },
  { pattern: "merely", level: "lite" },
  { pattern: "truly", level: "lite" },
  { pattern: "honestly", level: "lite" },
  { pattern: "frankly", level: "lite" },
  { pattern: "absolutely", level: "lite" },
  { pattern: "indeed", level: "lite" },
  { pattern: "surely", level: "lite" },
  { pattern: "presumably", level: "lite" },
  { pattern: "seemingly", level: "lite" },
  { pattern: "somewhat", level: "lite" },
  { pattern: "fairly", level: "lite" },
];
