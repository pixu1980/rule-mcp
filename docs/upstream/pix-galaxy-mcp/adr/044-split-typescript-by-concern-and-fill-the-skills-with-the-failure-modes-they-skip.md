# 044: Split TypeScript by concern and fill the skills with the failure modes they skipped

- **Date**: 2026-08-29
- **Status**: accepted
- **Tags**: typescript, skills, guardrails, routing, backend
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Two problems, one phase. First, rule-toolchain-typescript held two unrelated jobs: tsconfig flags and build strategy, which is configuration, and discriminated unions, branded types and the interface-versus-type rule, which is how code gets written. A reader looking for one read past the other, and neither half was complete. Second, several skills stopped exactly where production begins. backend-node documented scaffolding and quality gates and said nothing about what happens when many requests arrive at once. backend-security had eight infrastructure steps and nothing about the authentication lifecycle, which is where auth actually fails. styleguide-javascript gave three bullets to async, the single largest source of subtle bugs in the language. styleguide-css had none of the modern one-liners. In each case the missing content was not advanced material; it was the ordinary failure mode a reviewer flags every week.

## Decision

Create rule-styleguide-typescript for code style, move the type-design section out of the toolchain skill rather than duplicating it, and leave a pointer behind. Four guardrails enforce the mechanical rules - ts-no-explicit-any, ts-catch-unknown, ts-no-double-assertion, ts-union-over-enum - gated on the file being TypeScript so a .tsx file gets them from any skill and a .js file never does, with strings and comments stripped first so prose about any does not fail the rule about any. Then fill the gaps: seven traffic patterns and a vetted package list in backend-node, the ten authentication assumptions in backend-security, the DX failure catalog in backend-api-design, the six missing query anti-patterns in data-sql (the three already covered were left alone), a real async section in styleguide-javascript, the clean-code truths and senior practices in process-simplicity, twelve one-liners in styleguide-css, the platform-over-library table in platform-web, the formatter landscape in toolchain, and ten non-chatbot AI features in rule-mcp. Every external source is credited in the commit that adds its distillate.

## Consequences

Two router defects surfaced and were fixed rather than worked around. A skill documenting filler words was attracting every prompt containing one, so the stopword list now reuses the compressor's FILLER export: a word deleted as meaningless cannot decide which skill answers. Interrogatives joined it, because a heading reading "What the server does for you" was outscoring the heading that named the actual topic. A third lesson is documented rather than fixed: the router matches on word boundaries, so a camelCase API name in a heading is one token and matches nothing - "IntersectionObserver" made its section unreachable, "Intersection Observer" routes. Routing was spot-checked on twenty-three realistic prompts across the phase; the misses are single common words colliding with strongly-worded skills, which is the limit of a keyword scorer and not something content placement fixes. Cost: the skills grew by roughly 500 lines, which the tldr mode absorbs since it returns ranked sections rather than whole files.
