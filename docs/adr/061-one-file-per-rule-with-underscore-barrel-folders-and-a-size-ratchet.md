# 061: One file per rule with underscore-barrel folders and a size ratchet

- **Date**: 2026-09-06
- **Status**: accepted
- **Tags**: architecture, refactor, structure, guardrails
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The 150-line auto-splits produced meaningless file names (js-1..4, parts-1..4, vanilla-1..2, stopwords-a/b), duplicated two quality rules across parts-3 and parts-4, and left four 2-line legacy shims that doubled every module path. The rule-styleguide-patterns file-tree convention (index.js barrel, underscore-prefixed implementation files) was not applied to this server own source, and nothing stopped an ADR from being written in Italian.

## Decision

Split rule catalogs one file per rule under family folders (framework/js, framework/vanilla, quality/typescript-prose-manifest-simplicity-comments) with kebab-case underscore-prefixed names and index.js barrels assembling the arrays in canonical order. Move pure data to *.data.js files exempt from the size cap (bm25 stopwords). Remove the bm25.js, wcag-data.js, router.js and commands.js shims and import the folder index.js paths. Enforce with a ratcheting file-size budget test plus a junk-name ban, the new en-english-only-filenames guardrail in pix_check, and an English gate in rule_tool_process_adr. Document the code-splitting rule in rule-process-simplicity. Scripts become one folder per script and tests co-locate as **tests** folders in later phases.

## Consequences

Positive: file names say what they contain, duplicate rules are impossible by construction, one canonical import path per module, and the language and size rules are regression-tested. Negative: hundreds of small files and barrels to maintain, and deeper trees make relative imports longer.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Semantic-cluster files (fewer, bigger files per theme)
1. Keep the 2-line shims for import stability
1. Path allowlist in the size test instead of the *.data.js suffix convention
