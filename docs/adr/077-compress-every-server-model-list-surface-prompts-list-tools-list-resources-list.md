# 077: Compress every server→model list surface (prompts/list, tools/list, resources/list)

- **Date**: 2026-09-10
- **Status**: accepted
- **Tags**: token-efficiency, compression, mcp-surface, prompts, tools
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The standing mandate is that every interaction where the MCP server hands text to a model is compressed with the deterministic caveman pipeline. Tool results, resource bodies and prompt bodies already were; the three list surfaces were not. prompts/list had an explicit comment rejecting compression ("its descriptions are the schema clients render, not prose to shorten"), yet a prompt description is prose the model reads to pick one. tools/list descriptions are paid on every model turn (~24,301 tokens/turn surface; ~3,512 of them descriptions). resources/list labels are terse by design (measured ~0% saving).

## Decision

Compress the prose fields of all three list surfaces at the protocol boundary only: prompts/list shortens description and argument descriptions (names, required untouched; books telemetry source caveman-prompt-list), tools/list shortens tool descriptions in listTools() with the memo key extended by the caveman state (names, schemas, annotations untouched; no telemetry, it is memoized at startup), resources/list runs its labels through the pass which is a no-op on the real set but keeps the every-surface invariant. The existing opt-outs (RULE_MCP_CAVEMAN_LEVEL=off, RULE_MCP_NO_CAVEMAN=1) apply. completions/complete stays uncompressed: its payload is a fixed vocabulary, not prose.

## Consequences

Positive: every server→model list surface now runs the guarded pipeline; prompts/list saves ~4.5% of its descriptions every session start; tools/list saves ~0.7% of descriptions on every turn; one invariant across all surfaces; test coverage pinned per surface (router + resources listing tests + PERF-5 file). Negative: tool descriptions in tools/list and `pnpm tools` output read slightly terse (substance preserved by the guard); resources/list shows no measurable gain (accepted - it is an invariant, not a saving); tools/list memo is now keyed by caveman state as well as registry generation.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Compress in the registry (listPrompts/listTools producers): rejected - it would leak compressed prose into prompts/get help text, agent-command file generation and the CLI listing, and double-compress downstream
1. Keep prompts/list uncompressed (the pre-Phase-2 decision): rejected under the compress-every-surface mandate - the description is read by the model every session start
1. Compress entire tools/list JSON including schemas: rejected - schemas are machine-parsed data and compression corrupts them
