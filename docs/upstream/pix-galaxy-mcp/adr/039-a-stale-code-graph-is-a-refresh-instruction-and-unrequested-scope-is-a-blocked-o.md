# 039: A stale code graph is a refresh instruction, and unrequested scope is a blocked outcome

- **Date**: 2026-08-11
- **Status**: accepted
- **Tags**: tokensave, guardrails, routing, over-engineering, installer
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Two field reports from agents running this server. First: when tokensave serves an untracked branch it falls back to the nearest ancestor's graph and appends a warning to every response; models read that warning as "the graph is unreliable" and switch to grep and bulk file reads - the exact behavior the graph exists to prevent, at a much higher token cost. Second: large reasoning models over-build. Asked for a payment method, one produced four unrequested columns plus an audit table; the user had to notice the growth and ask for its removal, which cost a second full reasoning pass. A related ask: the model should offer to document a structural decision instead of waiting to be told.

## Decision

Treat both as conditions the server names and remediates rather than leaves to the model's judgment. For tokensave, a new core/tokensave.js reads .tokensave/branch-meta.json plus git HEAD and turns the fallback state into an instruction - run `tokensave branch add <branch>`, do not fall back to grep - carried by the gateway output and by the workflow reminder on every tool result. Remediation is layered so the condition also disappears at the source: the installer writes auto_track:true into the project's .tokensave/config.json and TOKENSAVE_AUTO_TRACK=1 onto a co-located tokensave MCP entry, the doctor reports branch and auto_track state with the fix command, and the server itself runs `tokensave branch add` detached when RULE_MCP_TOKENSAVE_AUTOTRACK=1. For scope, the constraint is stated at four layers: the workflow reminder (minimal change, propose instead of build), the router (a scope_contract naming what needs an explicit request and asking for files_to_change plus out_of_scope up front), a new rule-process-simplicity skill plus rules/simplicity.md, and three blocking guardrails in pix_check. Documentation becomes proactive through a docs_followup the router emits on structural prompts only.

## Consequences

Positive: the stale-index condition now produces a fix instead of a fallback to grep, and it self-heals for future branches once auto_track is on; the scope constraint is visible on every tool result rather than only when a simplicity skill happens to be routed; pix_check blocks three concrete over-engineering artifacts. Negative: the reminder grew by two lines, paid on every call; the new guardrails ship in SHARED so they run for every skill - they are pattern-narrow and verified against this repo's own source, minus guardrail-defs.js which matches by construction; enableTokensaveAutoTrack edits another server's entry in the user's agent config, intentional but a write outside this server's own key. Note: `pnpm run ci` had two failures on develop that pre-dated this change; both belonged to suites that have since left this repository.

## Alternatives Considered

1. Emit the tokensave directive only and let the user run the command - rejected: the warning is already emitted and ignored, so a louder message alone repeats the failure.
1. Always shell out to `tokensave branch add` from the server - rejected as the default: it would mutate the user's project on every call, so it stays behind an opt-in env while tokensave's own auto_track does the work.
1. Have the guardrails judge whether a requested column is necessary - rejected: not a static property. The guardrails cover mechanical residue only (an audit table nothing touches, future-use markers, commented-out implementations); the judgment side rides on the reminder and the scope contract.
1. Put the anti-over-engineering rule only in a skill - rejected: a skill is loaded when routed to, while the reminder rides on every tool result.
