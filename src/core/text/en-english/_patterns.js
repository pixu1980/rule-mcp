/** @module core/text/en-english/patterns - the foreign-language regexes */

import { FOREIGN_TOKENS, FOREIGN_NAME_TOKENS } from "../_en-english.data.js";

/**
 * Letters outside ASCII that an English comment or document has no call for.
 * Blocks that contain combining marks (Arabic, Hebrew, Devanagari, Thai) are
 * deliberately absent: a slash-and-cover range there would scan wrong text.
 */
export const NON_ASCII_LETTER =
  /[\u00C0-\u00FF\u0100-\u024F\u1E00-\u1EFF\u0370-\u03FF\u0400-\u047F\u048A-\u052F\u10A0-\u10FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/u;

/** Whole foreign function words, matched case-insensitively on word boundaries. */
export const FOREIGN_RE = new RegExp(String.raw`\b(?:${FOREIGN_TOKENS.join("|")})\b`, "gi");

/** Every foreign token, lowercased, for identifier and file-name membership tests. */
export const FOREIGN_NAME_SET = new Set([...FOREIGN_TOKENS, ...FOREIGN_NAME_TOKENS].map((t) => t.toLowerCase()));

/**
 * Word endings that only occur in non-English words. Same precision contract:
 * endings that English shares (`-mento`/memento, `-ung`/lung, `-are`/share)
 * are deliberately absent.
 */
export const FOREIGN_SUFFIX_RE =
  /(?:zione|zioni|izzare|izzata|izzato|aggio|anza|enza|encia|miento|mientos|ungen|keit|schaft)$/i;
