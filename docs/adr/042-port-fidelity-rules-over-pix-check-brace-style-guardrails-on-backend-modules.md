# 042: Port fidelity rules over pix_check brace-style guardrails on backend modules

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: port, guardrails, linters, decision
- **Author**: rule-mcp

## Context

Phase 2 (item 2) ports upstream core foundations (lifecycle, reclaim, resume, handon, cache, paths, telemetry foundations). The workflow requires pix_check on changed code. pix_check's js-no-inline-blocks guardrail requires Allman braces (brace on its own line), while the repository's enforced gate pnpm format (prettier) formats to same-line (K&R) braces: the two are mutually exclusive on every control block. The checker also mis-detects JSDoc presence on back-end modules (it is component-oriented: barrel-file-tree, a11y-test-required, component checks).

## Decision

Keep upstream port fidelity and the repository's own gates (eslint, prettier, test suites, audit, docs-accuracy) as the binding contract for backend modules; treat pix_check as binding for frontend/component code only. Do not reformat ported backend modules to Allman style, which would break pnpm format and diverge from the upstream source the port pins.

## Consequences

Positive: port diffs stay minimal and reviewable; the repo's CI contract (lint/format/tests) remains the single enforceable gate. Negative: pix_check reports failures on backend modules until the skill's brace rule is reconciled with repo formatting; note it so it is not re-flagged as a regression.

## Alternatives Considered

1. Reformat all ported backend modules to Allman braces, accepting pnpm format failure and large non-semantic diffs
1. Relax js-no-inline-blocks in the rule skill for backend paths
1. Configure prettier to Allman style repo-wide
