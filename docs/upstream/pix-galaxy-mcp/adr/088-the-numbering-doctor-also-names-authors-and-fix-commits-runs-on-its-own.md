# 088: The numbering doctor also names authors, and --fix-commits runs on its own

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: docs, adr, cli, tooling, git
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Three gaps in handoff doctor, all found by using it. ADR 086 made the author field name a person, but nothing keeps it that way: an ADR written by an older copy of this tool, or by hand, carries a tool name or no author line and no check notices. --fix-commits was conditional on the rename plan, so the second run - the one a person makes after --fix has already moved the files and been committed - found no renames and did nothing, while the messages naming the moved path were still there. And the command printed nothing until it was finished, though it reads every commit message in a range and can call git filter-branch.

## Decision

The plan carries plan.authors: ADRs whose author names a tool or nobody, with the person taken from the commit that added the file and the current git identity as the fallback. --fix repairs them, replacing the tool name or inserting the bullet next to Tags in that file's own punctuation; a document with neither an author line nor a tags bullet is left alone rather than guessed at. --fix-commits no longer depends on the plan: with no renames it derives them from history, because a slug survives a renumber, so a path whose file is gone and whose slug matches exactly one file is a rename it can state. It refuses on a dirty tree, since filter-branch does too and says nothing about why. Every step reports as it happens, and the CLI prints each line as it arrives.

## Consequences

The doctor now exits 1 on a repository whose ADRs name a tool, which is a new way for a dry run to be non-zero and the reason this repository was backfilled first. --fix-commits acting without a plan means it can rewrite messages nobody asked about in the same run, bounded by the same published-commit refusal as before. Deriving a rename from a slug is a guess with one witness: if two files share a slug under different numbers it declines, and if a slug was edited along with the number the reference stays stale. The progress lines go to stdout, so anything parsing this command's output now reads step lines before the summary.

## What would end this

A repository keeps ADR authors that are deliberately not people - a team account, an automation - and the check has to learn the difference; or the numbering repair stops being something a person runs by hand, at which point progress lines have nobody to inform.
