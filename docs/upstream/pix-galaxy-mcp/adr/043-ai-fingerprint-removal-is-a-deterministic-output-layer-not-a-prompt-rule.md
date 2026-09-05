# 043: AI-fingerprint removal is a deterministic output layer, not a prompt rule

- **Date**: 2026-08-29
- **Status**: accepted
- **Tags**: fingerprint, tokens, guardrails, output, skills
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

A reader identifies generated text before finishing the first line, and what gives it away is never the argument. It is the em dash nobody types, the curly quotes nobody types, and British spelling the house style does not use. One of these is a defect and not only a style slip: a curly quote pasted into source breaks the string literal it sits in. Asking a model to remember "American English, ASCII punctuation" is the same losing bet as asking it to remember any other rule, and this one has to hold on every single line of every answer. Separately, an audit of the prompt surface found the /rule-caveman command and the README prompt table naming five tools - pix_caveman, pix_caveman_commit, pix_caveman_review, pix_caveman_compress, pix_caveman_help - none of which had ever been registered, and no skills/rule-caveman directory to back them.

## Decision

Add src/core/fingerprint.js, a deterministic transformer that runs in router.finalizeResult after caveman compression, on both cache hits and fresh computes. It maps typographic characters to ASCII and British spelling to American, and it exempts exactly what the compressor exempts: fenced blocks, inline code spans, URLs and JSON. Code is excluded on purpose - a third-party API may be named getColour(), and rewriting an identifier breaks the call. A dash standing alone is left as a hyphen, because at the start of a line it is a list marker and alone in a table cell it means "none"; only a dash joining two clauses becomes a comma. The same module exports findFingerprints(), which the three new SHARED guardrails fp-no-emdash, fp-no-typographic-chars and fp-american-english report against; detector and transformer share one definition of scannable prose, so anything a guardrail flags can always be fixed by running the transformer. Two skills document the rules: rule-styleguide-fingerprint and rule-caveman, the latter replacing the phantom tool surface. One new action tool, pix_compress, exposes both passes for text the server never sees. The repository was cleaned with scripts/clean-prose.mjs so it passes its own rules. Opt out with RULE_MCP_NO_FINGERPRINT=1.

## Consequences

The transformer is idempotent, which the result cache requires: it replays decorated output, so a pass that drifted on a second run would replay a different string every time. Cost is one linear pass per prose content item. The British dictionary is explicit rather than rule-based, because a blanket -ise rule rewrites "advertise", "compromise" and "surprise", and a blanket -our rule cannot tell where a word starts; the price is that an unlisted word is left alone, which is the safe direction. Two modules necessarily fail fp-american-english on themselves - fingerprint.js is the dictionary and contains every word it maps - and that is documented in the module header rather than worked around. The separate skill-source compression pass that this phase also planned was measured and dropped: it saves 1% of skill bytes, because 56% of skills/**/*.md is fenced code, tables and headings that are untouchable by construction, and the remaining prose was already terse.
