

/**
 * @module core/text/en-english
 *
 * English-only prose detection (hardening: every generated comment, identifier
 * and document is English, American spelling).
 *
 * Companion to the British-to-US dictionary in {@link module:core/fingerprint}:
 * `findFingerprints` flags UK-only spellings (the -our / -ise / -re / -ogue
 * families and the whole-word map); this module flags content that is not
 * English at all - foreign function words and non-ASCII letters in comments
 * and identifiers, or foreign prose in a whole markdown document.
 *
 * Precision first, the same way the fingerprint stem families are built:
 * explicit word lists beat clever heuristics. A bare `de`, `la` or `son` is
 * English- or acronym-adjacent and would be noise, so the foreign tokens below
 * are the unambiguous ones only - a comment that carries two of them, or a
 * single non-ASCII letter, is very likely not English.
 */

export * from "./_patterns.js";
export * from "./_tokenize.js";
export * from "./_scan.js";
