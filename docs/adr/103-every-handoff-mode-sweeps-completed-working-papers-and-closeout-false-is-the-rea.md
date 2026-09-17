# 103: Every handoff mode sweeps completed working papers, and closeout false is the read-only run

- **Date**: 2026-09-17
- **Status**: accepted
- **Tags**: docs, closeout, handoff, handon, process
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

ADR 087 put the closeout sweep on close-session alone and rejected archiving in both modes, because a plain handoff was a read-only snapshot also used on resume through handon. That left the docs tree stale in the common case: a session that never ran close-session kept finished audits, reviews and plans on disk forever, and the sweep was reachable only by an explicit mode nobody typed at the end of an ordinary session. The maintainer asked for the sweep to happen automatically at handoff and at resume so docs/audits, docs/reviews and docs/plans stay current, and for handon to propose the next workstream instead of only verifying.

## Decision

Both handoff modes and handon archive completed working papers by default, in src/tools/handoff/_closeout.js, and report what they archived. A new optional closeout boolean, default true, is added to both tool schemas, to the CLI as --no-archive, and to the /rule-handoff vocabulary as the no-archive token: closeout false is the read-only diagnosis that writes nothing and renumbers nothing. Archiving and the ADR renumbering are now one act, so a run that writes ADRs repairs the numbering first and a run asked to touch nothing does neither. handon sweeps after it verifies, so the report describes the tree the handoff was written against rather than calling its own archived papers deleted; list mode stays a pure listing. handon then adds Next from the plans: for every docs/plans file with an unchecked step, newest date first, the nearest heading above the first open step plus that step, worded as a proposal the user confirms before work starts. The MCP readOnlyHint annotation on handon is dropped, and the skill and prompt vocabulary now say it writes through the sweep.

## Consequences

Finished working papers leave the tree at every handoff instead of only at a session close, so docs/audits, docs/reviews and docs/plans hold open work and nothing else. A plain handoff is no longer a pure read: it creates ADRs, deletes sources and can renumber, which the /rule-handoff workflow now covers with an explicit docs(adr) commit step before the handoff file is committed alone. Resume costs one extra mutation that the user can turn off. The plan proposal is derived, not stored: it re-reads docs/plans on every resume, so it cannot go stale, and it proposes only the first open step of each plan because the user owns the choice of workstream.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep the sweep on close-session only (ADR 087) and ask the user to run it: rejected because the stale tree was the complaint, and a mode that must be remembered is the reason it went stale.
1. Give handon a separate sweep tool or flag-only surface: rejected because the sweep is one implementation in _closeout.js and handon already walks the docs tree on every resume.
1. Have handon pick one active plan by convention: rejected as a guess, because five plan files live in docs/plans and any single pick would be wrong for four of them.
1. Add a third handoff mode for the sweep: rejected because the mode distinction does not describe it, and a boolean is the smaller surface.
