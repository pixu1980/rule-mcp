# 078: Compress agent command files at write time

- **Date**: 2026-09-10
- **Status**: accepted
- **Tags**: token-efficiency, compression, installer, agent-commands, write-time
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The compression-surface manifest (ADR 077) covers everything the server emits toward a model at runtime, but agent command files are emitted once at install time and then read by the agent on every session (Claude Code, Pi, Cursor, Roo, Windsurf, Cline, Devin). They are instructions in context; on the shipped bodies the caveman pass measures ~6%. The low-level renderer (renderAgentCommand) is canonical and pinned by several test suites, so write-time compression belongs in the files-emitting layer (renderAgentCommandFiles), gated by the same opt-outs as every other surface. Plan item 4a (handoff files) needs no server change: rule_tool_process_handoff returns already-compressed text via finalize and the agent writes that text to docs/handoff/.

## Decision

Compress the body of every agent command file at write time: renderAgentCommandFiles() applies the caveman pass to each rendered content when caveman is enabled, leaving renderAgentCommand() canonical and untouched. Frontmatter and placeholders pass through (code-shaped); the guard must report 0 errors; the write-time emission respects the same opt-outs as every other surface. Handoff files (plan 4a) need no write-time compression server-side: the tool output the agent saves is already compressed by finalize().

## Consequences

Positive: every agent command file an installer writes reaches disk already compressed (~6% measured on the shipped bodies) - the same instruction costs less on every session; frontmatter, YAML/TOML headers, $ARGUMENTS and {{args}} placeholders pass untouched (code-shaped lines); the structural guard keeps guard errors at 0 (296 samples across 4 formats); renderAgentCommand stays canonical so tests and parity are unaffected; the existing opt-outs (RULE_MCP_NO_CAVEMAN, RULE_MCP_CAVEMAN_LEVEL=off) gate it. Negative: files written by installers now depend on the caveman state of the installing process (default on) - a user who wants verbose installed files must run the installer with the opt-out; the installed instruction text is caveman-style prose (substance preserved).

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Compress bodies in renderAgentCommand itself: rejected - the canonical renderer is also the test/parity surface; write-time emission stays an explicit layer
1. Skip write-time compression: rejected - command files are read by the agent every session (measured ~6% on the shipped bodies), which is exactly the recurring-context case
1. Compress only 'workflow' format: rejected - every installed format is read by an agent
