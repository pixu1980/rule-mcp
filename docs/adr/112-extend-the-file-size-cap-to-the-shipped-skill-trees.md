# 112: Extend the file-size cap to the shipped skill trees

- **Date**: 2026-09-21
- **Status**: accepted
- **Tags**: architecture, quality-gate, file-size, skills
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The 150-line cap has covered src/, scripts/ and tests/ since ADR 061. The trees under skills/ are not covered: they are the assets a user receives, and six of their source files exceed the cap today - scaffold-component.mjs at 697 lines, _renderer.js 412, _filters.js 381, _expression-parser.js 371, _template-instance.js 335, _worker-pool.js 264. Those six are exactly the god files ARCH-7 must split to reach its gini gate, and the fifth, scaffold-component.mjs, is the third-highest complexity in the repo at 104 while being absent from the plan's list of four. A rule that does not cover the code that ships cannot keep the code that ships from growing back, and ARCH-6 showed what an unwatched gate costs: its work sat uncommitted while a test that would have caught the drift was itself not running.

## Decision

Add skills/ to the size-cap roots. Exempt the test files the skill trees ship beside their code, since a test table is data about behavior rather than a module that grew, and scope that exemption to skills/ so the roots already covered lose no file. Grandfather the six pre-existing offenders in the ratchet with their current sizes, which may only shrink. The ratchet's own rule that new entries are forbidden is amended to allow one adoption baseline taken when a root is added, recorded in the ADR that adds it.

## Consequences

The cap now reaches the code a user receives, so the six largest shipped files can only shrink: each split deletes its ratchet entry, and growth in any of them fails the build. The gate scans a few hundred more files, which costs milliseconds. The ratchet stops being a closed list - it can gain an adoption baseline whenever a root is added - which is a real loss of strictness, and the reason the baseline is tied to an ADR rather than to a commit. Test tables under skills/ stay outside the cap, so a shipped test may still grow without review; the reasoning is that a test table is read in one pass while a 700-line module is not, and the exemption is scoped to skills/ so no file already covered is dropped.

## What would end this

This leans on the six files being on their way to a split ARCH-7 already committed to. If those splits do not land, the ratchet becomes a permanent home for six god files with a ceiling that only ratifies the status quo - at that point the honest move is to delete the entries and treat the skills trees as shipped data, which is what alternatives 3 and 4 above describe.

## Alternatives Considered

1. Leave the cap over src/scripts/tests only: the six splits ARCH-7 performs would be unguarded, so the trees could re-bloat the moment the step closes.
1. Add all 14 over-cap files, tests included: 8 of them are test tables, and splitting a table by line count is churn without a reader benefit.
1. Treat skills/ as shipped content and exempt it wholesale: that leaves the tree's largest file (697 lines) permanently outside every size rule in the repo.
1. Split the six first and extend the cap after: the gate would not exist while the splits happen, which is the order this repo has already learned to avoid.
