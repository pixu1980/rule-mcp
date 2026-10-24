# 134: Close features only after persisting the final handoff and consolidate the feature by default

- **Date**: 2026-10-12
- **Status**: accepted
- **Tags**: git, handoff, adr
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The /rule-handoff close-feature prompt required an extra squash token and placed the rewrite ahead of the final handoff commit. The existing squash backend already consolidates in-range ADRs and handoffs behind a confirmation gate, but the command did not invoke it by default.

## Decision

Treat close-feature as implicit squash intent. Commit all pending work, closeout ADRs, and the final handoff first; then show the read-only squash plan and require user confirmation before rewriting the feature into one commit. Keep the old squash token accepted for compatibility; do not rewrite out-of-range documents.

## Consequences

The resulting feature commit includes the final handoff and consolidated ADR/handoff documents, with no post-squash commits. The close still pauses for explicit user consent; session-only handoff remains unchanged.

## What would end this

This ordering would need revision if handoffs stopped being committed documents or the squash backend stopped including all documents committed in the feature range.

## Alternatives Considered

1. Squash before generating the last handoff: leaves a second commit after the squash.
1. Automatically confirm the rewrite: unsafe for history-changing operations.
