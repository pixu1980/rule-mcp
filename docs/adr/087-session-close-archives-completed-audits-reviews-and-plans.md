# 087: Session close archives completed audits, reviews and plans

- **Date**: 2026-09-11
- **Status**: superseded
- **Tags**: process, handoff, docs
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

> Superseded by [ADR 103](103-every-handoff-mode-sweeps-completed-working-papers-and-closeout-false-is-the-rea.md) on the mode question only: the sweep now runs in every handoff mode and in handon, because restricting it to close-session left finished papers on disk. What counts as complete, the one-ADR-per-doc fold and the English gate stay as this decision wrote them.

## Context

Completed working papers under docs/audits, docs/reviews and docs/plans accumulate after their work is done and nothing retires them. The handoff tool already scans docs/ on every run, so the session close is the natural place to fold finished records into ADRs and remove the sources.

## Decision

In close-session mode only, rule_tool_process_handoff folds each completed doc into one Nygard ADR via src/tools/handoff/_closeout.js (reusing the ADR generators, the English gate and the index updater), names it in a Closeout handoff section, then deletes the source file. Plain handoff mode stays read-only. Completion means: plans carry checks with none open, reviews show a Status column with no open row, audits have a same-basename review that is complete. Docs failing the English gate are skipped and kept, with the reason reported.

## Consequences

Completed working papers leave the tree on session close; each survives as one ADR plus a Closeout section in the persisted handoff, with full text recoverable from git history. Close-session becomes the first destructive mode of the handoff tool. The rule-mcp blank-line guardrails are intentionally not adopted: every committed file violates them and the 150-line budget plus repo-wide consistency win.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Archive in both handoff modes (rejected: plain handoff is a read-only snapshot, also used on resume via handon)
1. Add a dedicated closeout tool or schema flag (rejected: no new surface; the mode distinction already exists)
