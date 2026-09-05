# 052: One generated ADR index, because the hand-kept one went stale

- **Date**: 2026-08-31
- **Status**: accepted
- **Tags**: adr, documentation, tooling, generation, cleanup

- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

`docs/adr/` carried two indexes of the same set of decisions. `README.md` was generated: `pix_process_adr` rewrote it from scratch on every call, reading title, date, status and tags back out of the numbered files, so it could not fall behind. `DECISIONS.md` was written by hand, grouped the decisions into themes and gave each one a Decision and Consequences line, and had stopped at ADR 040 - ten decisions behind, including every ADR from the token-first upgrade. Its own closing line asked the reader to "keep this summary and README.md synchronized with every ADR file", which is the request that had not been met. This is the failure ADR 049 named two commits earlier, in the same directory that records it: parallel normative documentation drifts, and the copy nobody executes is the copy that goes stale.

## Decision

One file, `docs/adr/ADR.md`, and everything in it derived from the ADR files. It carries what both predecessors carried: the chronological index, a Decision and Consequence line per ADR, the themes, and the operating rules. The two summary lines are now lifted from the `## Decision` and `## Consequences` sections rather than written, taking the first sentence of each, cut at a word past 220 characters and escaped so a pipe in the prose cannot break the table. The sentence split refuses to fire on a filename, because the period in `ascii-box.js` is followed by a lowercase letter while a real sentence break is followed by whitespace and a capital or a code span. Themes are grouped by tag rather than by hand, listing every tag carried by three or more decisions, with each decision appearing under each theme it carries and the eight early ADRs that predate the tag field collected at the end. The assertion that makes drift impossible is in `test/adr-index.test.mjs`: regenerating the index from the files on disk has to reproduce the committed file byte for byte, so a hand edit or a missed regeneration fails the build rather than sitting there.

## Consequences

The index gained the ten decisions the summary was missing and can never miss another. `README.md` in a directory is what a git host renders when you browse it, and `ADR.md` is not, so opening `docs/adr/` on the web now lists files instead of showing the index; the trade was made deliberately for a name that says what the file is. The generated one-liners read slightly more mechanically than the hand-written ones they replace, which is the price of them being true. Two Italian strings in the same tool were replaced while it was open: the index header, and the three placeholders `generateAdr` writes when a caller omits a section.

## Alternatives Considered

1. Keep both files and complete `DECISIONS.md` by hand. Rejected: it restores the exact defect, and the file had already demonstrated it.
2. Merge into `README.md` and keep the directory rendering. Rejected in favor of a filename that names its contents.
3. Drop the per-ADR summaries and keep only the index and themes. Rejected: the summary is what lets a reader scan fifty decisions without opening fifty files.
