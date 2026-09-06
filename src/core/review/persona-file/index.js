/**
 * @module core/review/persona-file
 *
 * One persona, one file: read and write a persona as markdown.
 *
 * The catalog is a directory (`src/personas/*.md`, plus the user overlay layer
 * `~/.rule-mcp/config/roles/*.md`) read by the server at startup; adding
 * or removing a persona is a filesystem op, not a code change. This module is
 * the only thing that knows the file format.
 *
 * Structured fields sit in the frontmatter; the lenses sit in the body as a
 * bullet list. That split is not cosmetic. A lens is a sentence written for a
 * person - "caches: hit rate, invalidation, and what they hide" - and a bare
 * YAML list item carrying a colon parses as a map. Prose belongs in prose.
 *
 * Deliberately dependency-free apart from node built-ins: `review-roles.js` is
 * imported by the prompt registry, which is imported by the command generator,
 * and reaching for the skill frontmatter parser would pull the whole tool graph
 * into that chain.
 */

export { parsePersonaFile } from "./_parse.js";
export { formatPersonaFile } from "./_format.js";
