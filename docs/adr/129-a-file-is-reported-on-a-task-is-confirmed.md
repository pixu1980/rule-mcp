# 129: A file is reported on, a task is confirmed

- **Date**: 2026-10-01
- **Status**: accepted
- **Tags**: hooks, guardrails, permissions, write, enforcement
- **Author**: Emiliano Pisu <emiliano.pisu@pixu1980.com>

## Context

A PreToolUse gate on Write, Edit and MultiEdit that asks or denies on language
and guardrail failures puts a person in the loop of every edit, in every
project that installed the hooks. The rules that reach ordinary code are not
rare ones, so the cost is the shape of the gate rather than its rate. Against
that sits a real need: a structural change is worth a person's attention. The
question was never wrong. It was asked of the wrong unit.

## Decision

A file is reported on. A task is confirmed.

The file hook moves from PreToolUse to PostToolUse and loses the power to
decide anything. PostToolUse carries `additionalContext` and no
`permissionDecision`, so the language and guardrail reports reach the model and
nobody else. Both halves are collected instead of the first one winning. The
file is read from disk after the write rather than replayed from the payload.
A settings file from before this ADR that still calls `guard write` from
PreToolUse answers a plain allow, and `neverBlocks` coerces any decision the
write path could grow back into one.

The confirmation that remains is asked once per task, at the first structural
write, and not again until the next prompt. A task runs from one
`UserPromptSubmit` to the next. The model declares a task structural with
`rule_tool_structural`, and its summary is what the question states. Two
deterministic signals are the net under the declaration: a write under
`docs/adr`, and a change to a manifest's dependency blocks. Creating a file is
never structural on its own: a new module is ordinary work. A write landing
after the question was asked is the answer to it.

The two Bash asks are unchanged: migration and commit.

## Consequences

No file written on this machine is ever confirmed by a person again for an em
dash or a British spelling. The structural gate asks once per architectural
task. Tests assert both halves: `write-never-blocks` and `structural-gate`.

## What would end this

A host that carries neither a post-tool report event nor a prompt boundary
leaves the file report with nowhere to go and the task with no boundary; the
honest answer there is no file hook rather than a gate that asks per file.
