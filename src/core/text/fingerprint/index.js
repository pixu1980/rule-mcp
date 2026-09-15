

/**
 * @module core/text/fingerprint
 *
 * Removes the tells that mark a text as machine-written.
 *
 * Two of them, both cheap to fix and both immediately visible to a reader:
 * typographic characters nobody reaches for on a keyboard (em dashes, curly
 * quotes, the ellipsis glyph, bullets, arrows), and British spelling, which the
 * house style does not use. A human writing at a terminal types a hyphen and a
 * straight quote and writes "color"; anything else reads as generated.
 *
 * Safety contract, identical to the compressor's - the transformer NEVER
 * touches:
 *   - fenced code blocks (``` ... ```)
 *   - inline code spans (`...`)
 *   - URLs
 *   - content whose text is JSON (data, not prose)
 *
 * Code is excluded on purpose and not by accident: a third-party API is allowed
 * to be named `getColour()`, and rewriting an identifier breaks the call.
 *
 * Idempotent: strip(strip(x)) === strip(x). The result cache replays decorated
 * output, so a transformer that drifted on a second pass would replay a
 * different string every time.
 *
 * This module necessarily fails `fp-american-english` on itself: it is the
 * dictionary, so it contains every word it maps. Nothing to fix there.
 *
 * @see module:core/text/compression - the other half of the output layer (filler removal)
 */

export * from "./_patterns.js";
export * from "./_scan.js";
export * from "./_rewrite-line.js";
export * from "./_strip.js";
