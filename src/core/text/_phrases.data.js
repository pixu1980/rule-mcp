

/**
 * @module core/text/phrases.data
 *
 * Multi-word rewrites, each tagged with the lowest intensity level that
 * applies it. Ported from the rule table in `skills/rule-caveman/SKILL.md`:
 * pleasantries, throat-clearing openers and hedging are `lite`; the
 * structural rewrites that shorten a clause are `full`; arrow causality is
 * `ultra`.
 *
 * Phrases always run before single words (see `./_caveman-line.js`): a word
 * table that fires first eats the head of a phrase and inverts it - "quite a
 * few" became "few" that way, which is the opposite of what it means.
 */

/**
 * `anchored` entries are whole pleasantries, dropped only when they OPEN a
 * line. A pleasantry is a sentence, not a word: matching "happy to help"
 * anywhere turned "I would be happy to help you with that." into "I would be
 * you with that.", which costs a reader more than the tokens it saved.
 *
 * @type {Array<{ from: string, to: string, level: "lite"|"full"|"ultra", anchored?: boolean }>}
 */
export const PHRASES = [
  // ── lite: pleasantries that open a line, dropped whole ──
  { from: "sure", to: "", level: "lite", anchored: true },
  { from: "certainly", to: "", level: "lite", anchored: true },
  { from: "of course", to: "", level: "lite", anchored: true },
  { from: "great question", to: "", level: "lite", anchored: true },
  { from: "i would be happy to help you with that", to: "", level: "lite", anchored: true },
  { from: "i would be happy to help", to: "", level: "lite", anchored: true },
  { from: "i'd be happy to help", to: "", level: "lite", anchored: true },
  { from: "i am happy to help", to: "", level: "lite", anchored: true },
  { from: "happy to help", to: "", level: "lite", anchored: true },
  { from: "i can help with that", to: "", level: "lite", anchored: true },
  { from: "let me help you with that", to: "", level: "lite", anchored: true },
  { from: "as you can see", to: "", level: "lite", anchored: true },
  { from: "that being said", to: "", level: "lite", anchored: true },
  { from: "with that said", to: "", level: "lite", anchored: true },

  // ── lite: openers and hedging, dropped anywhere ──
  { from: "of course", to: "", level: "lite" },
  { from: "it is worth noting that", to: "", level: "lite" },
  { from: "it's worth noting that", to: "", level: "lite" },
  { from: "it is important to note that", to: "", level: "lite" },
  { from: "it should be noted that", to: "", level: "lite" },
  { from: "please note that", to: "", level: "lite" },
  { from: "note that", to: "", level: "lite" },
  { from: "keep in mind that", to: "", level: "lite" },
  { from: "it seems that", to: "", level: "lite" },
  { from: "it appears that", to: "", level: "lite" },
  { from: "feel free to", to: "", level: "lite" },
  { from: "in my opinion", to: "", level: "lite" },
  { from: "needless to say", to: "", level: "lite" },
  { from: "at the end of the day", to: "", level: "lite" },
  { from: "as a matter of fact", to: "", level: "lite" },
  { from: "please", to: "", level: "lite" },
  { from: "kind of", to: "", level: "lite" },
  { from: "sort of", to: "", level: "lite" },

  // ── full: structural rewrites ──
  { from: "in order to", to: "to", level: "full" },
  { from: "in order for", to: "for", level: "full" },
  { from: "as well as", to: "and", level: "full" },
  { from: "quite a few", to: "many", level: "full" },
  { from: "a large number of", to: "many", level: "full" },
  { from: "a number of", to: "several", level: "full" },
  { from: "the majority of", to: "most", level: "full" },
  { from: "a variety of", to: "various", level: "full" },
  { from: "due to the fact that", to: "because", level: "full" },
  { from: "in spite of the fact that", to: "although", level: "full" },
  { from: "in the event that", to: "if", level: "full" },
  { from: "at this point in time", to: "now", level: "full" },
  { from: "at the present time", to: "now", level: "full" },
  { from: "at this time", to: "now", level: "full" },
  { from: "right now", to: "now", level: "full" },
  { from: "in the near future", to: "soon", level: "full" },
  { from: "on a regular basis", to: "regularly", level: "full" },
  { from: "at all times", to: "always", level: "full" },
  { from: "at the very least", to: "at least", level: "full" },
  { from: "at the very best", to: "at best", level: "full" },
  { from: "prior to", to: "before", level: "full" },
  { from: "subsequent to", to: "after", level: "full" },
  { from: "for the purpose of", to: "for", level: "full" },
  { from: "with regard to", to: "about", level: "full" },
  { from: "with respect to", to: "about", level: "full" },
  { from: "take into account", to: "consider", level: "full" },
  { from: "make a decision", to: "decide", level: "full" },
  { from: "has the ability to", to: "can", level: "full" },
  { from: "is able to", to: "can", level: "full" },
  { from: "are able to", to: "can", level: "full" },
  { from: "in addition", to: "also", level: "full" },
  { from: "each and every", to: "every", level: "full" },
  { from: "first and foremost", to: "first", level: "full" },
  { from: "whether or not", to: "whether", level: "full" },
  { from: "the reason why", to: "why", level: "full" },
  { from: "as a result", to: "so", level: "full" },

  // ── ultra: arrow causality ──
  { from: "which leads to", to: "->", level: "ultra" },
  { from: "which results in", to: "->", level: "ultra" },
  { from: "which means", to: "->", level: "ultra" },
  { from: "leads to", to: "->", level: "ultra" },
  { from: "results in", to: "->", level: "ultra" },
  { from: "for example", to: "e.g.", level: "ultra" },
  { from: "that is to say", to: "i.e.", level: "ultra" },
];
