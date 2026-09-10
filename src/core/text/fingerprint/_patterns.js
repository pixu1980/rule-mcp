

/** @module core/text/fingerprint/patterns - the regexes, built from the dictionaries */

import { OUR_STEMS, ISE_STEMS, RE_STEMS, OGUE_STEMS, WORDS } from "../_fingerprint.data.js";

/**
 * The em dash, in the three shapes it appears in.
 *
 * As a clause break or a parenthetical it becomes a comma, which is what a
 * person types. But a dash standing alone is not punctuation at all: at the
 * start of a line it is a list marker, and alone in a table cell it means
 * "none". Turning either into a comma destroys the meaning, so both stay a
 * hyphen. Order matters - the standalone cases are matched first.
 */
export const EM_DASH_LIST = /^(\s*)\u2014\s*/;
export const EM_DASH_ALONE = /(^|\|)(\s*)\u2014(\s*)($|\|)/g;
export const EM_DASH_CLAUSE = /\s*\u2014\s*/g;

export const WORD_RE = new RegExp(String.raw`\b(${[...WORDS.keys()].join("|")})\b`, "gi");
export const OUR_RE = new RegExp(String.raw`\b(${OUR_STEMS})our(s|ed|ing|able|ite|ites|ful|less|al|ally|ist|ists|ism|ed)?\b`, "gi");
export const ISE_RE = new RegExp(String.raw`\b((?:un|re)?(?:${ISE_STEMS}))(e|es|ed|ing|ation|ations|er|ers|able)\b`, "gi");
export const RE_RE = new RegExp(String.raw`\b(${RE_STEMS})(re|res|red|ring)\b`, "gi");
export const OGUE_RE = new RegExp(String.raw`\b(${OGUE_STEMS})ogue(s)?\b`, "gi");

/** Dashes a person does not type. Kept separate: this is the strongest tell. */
export const DASH_RE = /[\u2014\u2013\u2012]/g;

/** Curly quotes and the ellipsis glyph: they break pasted code, not only style. */
export const TYPOGRAPHIC_RE = /[\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2026]/g;
