# 108: The handoff family gets a generated index, and the root HANDOFF summary retires

- **Date**: 2026-09-20
- **Status**: accepted
- **Tags**: handoff, docs, cli, doctor, code-graph
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

docs/adr/ADR.md is generated from the ADR files, but the handoff family had no index: the only list of handoffs was computed at runtime by the handon tool, and nothing on disk described the family. Worse, a family whose index was absent read as clean, because the doctor compared only a file that existed. A root HANDOFF.md, rewritten from the handoff text when a project already had one, shared the name while holding something else entirely.

## Decision

docs/handoff/HANDOFF.md is generated from the numbered handoff files by handoff doctor, exactly as docs/adr/ADR.md is generated from the ADRs. A family with documents and no index is stale by definition, so the doctor creates the index it finds missing; a family whose directory is absent is left alone, because conjuring a directory is not this repair's decision. The root HANDOFF.md summary is retired: two artifacts under one name cannot be told apart, and the numbered documents already carry what it said.

## Consequences

The doctor is the only writer of the index; editing it by hand is work the next run discards. A missing index is reported and created instead of reading as clean, so a project with handoffs but no HANDOFF.md now has one after a doctor run. Projects that kept a root HANDOFF.md summary lose it; the generated handoff text is unchanged, and the index covers the numbered documents. The two indexes share one table renderer, which moved to core/text.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep refreshing a root HANDOFF.md and add the index beside it: two files named HANDOFF.md in one project.
1. Name the index docs/handoff/index.md: a second convention for the same kind of artifact.
1. Refresh an index only when it already exists: a project that never committed one would never get it.
1. Leave the index to the handon tool at read time: nothing on disk would describe the family, and no link would resolve.
