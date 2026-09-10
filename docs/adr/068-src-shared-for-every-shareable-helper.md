# 71. src/shared for every shareable helper

## Status

accepted

## Decision

All cross-cutting helpers with more than one caller live in `src/shared/`
with a barrel (`index.js`) as the single home: the guardrail verdict shapes
(`countedVerdict`, `tsSkipResult`, `passResult`, the TS predicates), the tool
response envelopes (`textResult`, `errorResult`) and the shell-out helper
(`tryExec`). The no-duplicate-blocks gate (`tests/docs/no-duplicate-blocks.test.mjs`)
fails when a 4-line code window repeats across three or more source files,
keeping future helpers out of the tree.

## Consequences

Guardrail rules now end in one shared verdict builder instead of 16 copies of
the same object literal, tool errors build through one envelope, and the
exec/try helpers have a single definition. Files that vend output - generated
scaffold templates - are exempt from the gate because they must stay
standalone.
