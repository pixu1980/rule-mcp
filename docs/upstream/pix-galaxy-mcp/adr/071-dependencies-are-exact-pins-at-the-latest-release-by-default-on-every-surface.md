# 071: Dependencies are exact pins at the latest release, by default, on every surface

- **Date**: 2026-09-03
- **Status**: accepted
- **Tags**: dependencies, supply-chain, policy, enforcement
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

The repo already enforced exact pins in generated manifests (guardrail pkg-exact-versions, save-exact=true) but carried caret ranges in its own pnpm-workspace.yaml overrides, and the pnpm skill taught pinning to the installed version rather than the newest. During hardening step 0.2 (10 production vulnerabilities via transitive deps) the user set a stronger rule: dependencies are always updated to the latest possible release and always pinned exactly - no ^ or ~ anywhere, overrides included - and the rule must be a default carried by every prompt/skill/tool surface of this server, with an opt-out flag.

## Decision

Adopt exact-latest as the default dependencies policy on every surface. A DEPS_EXACT_LATEST directive (src/core/directive.js) rides the workflow reminder appended to tool results (full form: "exact pins at the latest release (no ^ or ~; pnpm add --save-exact), and bump to latest when touching a manifest"; terse form: "deps exact@latest"). RULE_MCP_LOOSE_DEPS=1 is the opt-out for projects that manage versions elsewhere. The repo's own pnpm-workspace.yaml overrides are pinned exactly (fast-uri 3.1.7, @hono/node-server 2.1.1, hono 4.13.5, qs 6.16.0); the only surviving range is the brace-expansion security allowlist, which spans majors required by different consumers and cannot be a single exact version. The pnpm skill now teaches bump-to-latest-then-test instead of pin-to-installed.

## Consequences

Positive: security patches flow by default; manifests read as facts (the version named is the version installed); one sentence of policy is carried mechanically instead of remembered. Negative: bumping to latest on every manifest touch can surface breaking changes - the policy therefore requires running the test suite after the bump; the reminder grows by one line (to be weighed in the reminder-diet step 4.2); RULE_MCP_LOOSE_DEPS joins the env-flag surface and needs documenting (done in docs/06-env-variables.md).

## Alternatives Considered

1. Keep exact pins but freeze on the installed version (previous skill guidance) - rejected: freezing blocks security patches and was explicitly overruled by the user
1. Ranges with lockfile discipline - rejected: the lockfile pins only for whoever has it, and any pnpm up/add/merge re-resolves
1. Policy only in docs, not in the reminder - rejected: the user asked for the rule at the base of every prompt/skill/tool, default-on
