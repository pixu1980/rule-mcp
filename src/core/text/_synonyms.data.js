/**
 * @module core/text/synonyms.data
 *
 * Short synonyms: one word swapped for a shorter one that says the same thing.
 * The `full` half of the rule table in `skills/rule-process-compression/SKILL.md` ("short
 * synonyms - big not extensive, fix not implement a solution for").
 *
 * Connectives that need a comma to read right ("however", "nevertheless") are
 * deliberately absent: rewriting "X, however, Y" to "X, but, Y" trades a token
 * for broken English.
 */

/** @type {Array<{ from: string, to: string, level: "full" }>} */
export const SYNONYMS = [
  { from: "utilize", to: "use", level: "full" },
  { from: "utilizes", to: "uses", level: "full" },
  { from: "utilized", to: "used", level: "full" },
  { from: "utilizing", to: "using", level: "full" },
  { from: "additional", to: "more", level: "full" },
  { from: "additionally", to: "also", level: "full" },
  { from: "furthermore", to: "also", level: "full" },
  { from: "moreover", to: "also", level: "full" },
  { from: "consequently", to: "so", level: "full" },
  { from: "therefore", to: "so", level: "full" },
  { from: "approximately", to: "about", level: "full" },
  { from: "currently", to: "now", level: "full" },
  { from: "previously", to: "before", level: "full" },
  { from: "subsequently", to: "then", level: "full" },
  { from: "demonstrate", to: "show", level: "full" },
  { from: "demonstrates", to: "shows", level: "full" },
  { from: "numerous", to: "many", level: "full" },
  { from: "extensive", to: "big", level: "full" },
  { from: "sufficient", to: "enough", level: "full" },
  { from: "require", to: "need", level: "full" },
  { from: "requires", to: "needs", level: "full" },
  { from: "required", to: "needed", level: "full" },
  { from: "attempt", to: "try", level: "full" },
  { from: "attempts", to: "tries", level: "full" },
  { from: "initiate", to: "start", level: "full" },
  { from: "commence", to: "start", level: "full" },
  { from: "terminate", to: "end", level: "full" },
  { from: "facilitate", to: "help", level: "full" },
  { from: "obtain", to: "get", level: "full" },
  { from: "purchase", to: "buy", level: "full" },
  { from: "regarding", to: "about", level: "full" },
  { from: "concerning", to: "about", level: "full" },
  { from: "frequently", to: "often", level: "full" },
  { from: "typically", to: "usually", level: "full" },
  { from: "modification", to: "change", level: "full" },
  { from: "modifications", to: "changes", level: "full" },
];
