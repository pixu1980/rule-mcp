# 072: Auto-update is notify-only by default; the merge happens when the user asks

- **Date**: 2026-09-03
- **Status**: accepted
- **Tags**: security, self-update, supply-chain, defaults
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Since ADR 032 every local git install fetched and fast-forward-merged upstream at most 60 s after a tool call. The allowlisted-remote check and ff-only kept the mechanics safe, but the default meant a compromised upstream (or maintainer account takeover) became remote code execution on the whole fleet within a minute - hardening finding F-S3, the exact rug-pull shape of the 2025-26 npm supply-chain worms. Commit-signature verification existed but was opt-in.

## Decision

The update check keeps running on the same throttle, but the default becomes notify-only: when upstream is ahead, the banner announces "update available (from->to, N commits behind), run pix_update or rule-mcp update" and HEAD does not move. The explicit paths (pix_update tool, CLI update) pass mode:"merge" and apply the fast-forward with all existing gates (allowed remote, clean tree, optional signature). RULE_MCP_AUTO_UPDATE=merge restores the automatic fast-forward for fleets that accept the trade. A branch merely ahead of upstream reports nothing (behind-count gate).

## Consequences

Positive: the rug-pull window closes - code changes only on explicit user action; the banner keeps update pressure visible; signature verification still composes on top of explicit merges. Negative: fleets stop auto-converging on latest by default (mitigated by the env flag and by the banner nagging on every session with an update pending); one more env var to document (done in docs/06-env-variables.md). Supersedes the forced-merge default described in ADR 032; the allowlisted-remote model of ADR 032 is unchanged.

## Alternatives Considered

1. Keep forced fast-forward and make signature verification mandatory - rejected: upstream does not sign every commit today, so updates would silently stop
1. Remove auto-update entirely - rejected: the check and the banner are the mechanism that keeps a fleet current; only the unattended merge is the risk
1. Notify-only with no env escape hatch - rejected: single-owner installs updating from their own remote reasonably prefer the old behavior
