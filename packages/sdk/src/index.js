/**
 * @module @rule-mcp/sdk
 *
 * Everything a guardrail needs, and nothing else.
 *
 * A guardrail is an object with an `id`, a `label`, a `description` and a
 * `check(code, context)` that returns a verdict. This package is the surface
 * those checks are written against, so a skill that carries its own rules
 * carries a declared dependency rather than a path into somebody's `src/`
 * (ADR 079).
 *
 * What is exported here is contract and follows semver. What is not exported
 * is not available, deliberately: a rule that reaches into an internal module
 * is a rule that breaks on a refactor it never saw.
 */

/** Verdict constructors: the shapes a check returns. */
export { countedVerdict, passResult, tsSkipResult, isTypeScriptFile, TS_EXTENSION, TS_SYNTAX } from "./_verdict.js";

/** Source helpers: read the code a check was handed without re-parsing it. */
export { extractRealCSS, looksLikeStylesheet, looksLikeStyling, maskLiterals, unjustifiedGrids } from "./_source.js";

/** Manifest helpers: what a package.json says about its dependencies. */
export { EXACT_VERSION, INSTALLED_GROUPS, MANIFEST_FILE, NOT_A_RANGE, isPinned, isTypeScript, manifestOf, stripLiterals } from "./_manifest.js";

/** Prose scanners: the ones the bundled prose rules are built on. */
export { findFingerprints, findRaggedBoxes, scanCodeForForeign, scanDocumentForForeign, scanPathForForeign } from "./_prose.js";
