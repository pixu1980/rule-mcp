

/** @module core/text/fingerprint/rewrite-line - the per-line rewrites */

import { CHARACTER_MAP, SEQUENCE_MAP, RE_ENDINGS, WORDS } from "../_fingerprint.data.js";
import { EM_DASH_ALONE, EM_DASH_CLAUSE, EM_DASH_LIST, ISE_RE, OGUE_RE, OUR_RE, RE_RE, WORD_RE } from "./_patterns.js";

// One body, two passes: "is this data rather than prose" is the same question
// for the compressor and for the fingerprint rewriter, and two copies of the
// answer drift apart (SIMP-5).
export { looksLikeJson } from "../_classify.js";

/**
 * Give `target` the capitalisation of `source`: ALL CAPS stays all caps, an
 * initial capital stays capitalised, anything else is left lowercase.
 *
 * @param {string} source - the word as written
 * @param {string} target - the American form, lowercase
 * @returns {string}
 */
export function matchCase(source, target) {
  if (source === source.toUpperCase() && /[A-Z]/.test(source)) {
    return target.toUpperCase();
  }

  if (source[0] === source[0]?.toUpperCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }

  return target;
}

/** @param {string} line @returns {string} */
export function americanise(line) {
  return line
    .replaceAll(WORD_RE, (match) => matchCase(match, WORDS.get(match.toLowerCase())))
    .replaceAll(OUR_RE, (match, stem, suffix = "") => matchCase(match, `${stem.toLowerCase()}or${suffix.toLowerCase()}`))
    .replaceAll(ISE_RE, (match, stem, suffix) => matchCase(match, `${stem.toLowerCase().slice(0, -1)}z${suffix.toLowerCase()}`))
    .replaceAll(RE_RE, (match, stem, ending) => matchCase(match, `${stem.toLowerCase()}${RE_ENDINGS.get(ending.toLowerCase())}`))
    .replaceAll(OGUE_RE, (match, stem, plural = "") => matchCase(match, `${stem.toLowerCase()}og${plural.toLowerCase()}`));
}

/** @param {string} line @returns {string} */
export function asciify(line) {
  let work = line.replace(EM_DASH_LIST, "$1- ").replaceAll(EM_DASH_ALONE, "$1$2-$3$4").replaceAll(EM_DASH_CLAUSE, ", ");

  for (const [pattern, replacement] of SEQUENCE_MAP) {
    work = work.replaceAll(pattern, replacement);
  }

  return [...work].map((character) => CHARACTER_MAP.get(character) ?? character).join("");
}

/**
 * Clean one prose line, protecting inline code and URLs from every rule.
 *
 * `spellingOnly` keeps the spelling rules and drops the character map. It is
 * for files whose strings are drawn on a terminal rather than read as prose: an
 * installer's arrow and bullet are deliberate interface, and rewriting them to
 * `->` and `-` degrades the thing they were chosen for. British spelling in the
 * same file is still British spelling.
 *
 * @param {string} line
 * @param {boolean} [spellingOnly]
 * @returns {string}
 */
export function cleanLine(line, spellingOnly = false) {
  const spans = [];
  const protect = (match) => {
    spans.push(match);

    return `__FP_SPAN_${spans.length - 1}__`;
  };
  const work = line.replaceAll(/`[^`]*`/g, protect).replaceAll(/https?:\/\/\S+/g, protect);

  return americanise(spellingOnly ? work : asciify(work)).replaceAll(/__FP_SPAN_(\d+)__/g, (_, index) => spans[Number(index)]);
}
