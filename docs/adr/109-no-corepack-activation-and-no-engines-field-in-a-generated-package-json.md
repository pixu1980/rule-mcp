# 109: No corepack activation and no engines field in a generated package.json

- **Date**: 2026-09-20
- **Status**: accepted
- **Tags**: guardrails, pnpm, corepack, manifest, gateway, toolchain
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Language models write deployment boilerplate into generated manifests: `packageManager`, `engines`, `devEngines.packageManager`. The first and third activate corepack, which then gets a vote on whether the install runs - it downloads a package manager on a machine that is offline, verifies a signature from behind a proxy that rewrites it, and shadows the package manager already on PATH. `engines` reaches the same veto another way: npm, pnpm and yarn warn or refuse when the running Node falls outside the declared range. The rule that forbade the corepack fields said `engines` was fine because it asserts a version and fetches nothing, which is true about the fetch and beside the point about the veto.

## Decision

rule-mcp does not support either kind of field. Two guardrails own it: `pkg-no-corepack` for `packageManager` and `devEngines.packageManager`, `pkg-no-engines` for `engines`. The path-bound write path strips them from a generated manifest before it checks, so the guardrail runs on what would be written, the receipt binds the cleaned content, and the reply carries it back for the caller to apply. The repository drops `engines` from its own package.json: the Node floor lives in `.nvmrc`, in the installers (`NODE_MIN=20`) and in CI, where a person reads it and nothing acts on it during an install.

## Consequences

rule-mcp's own package.json no longer declares `engines`, so consumers no longer get npm's version warning; the Node floor is enforced by the installers (`NODE_MIN=20`) and stated where a person reads it. A model that writes the fields through the path-bound gateway flow gets a receipt for the cleaned manifest and must apply what the reply returns; the original content is refused by hash. A bare `code` string carries no path and so is neither checked nor cleaned, which is why a manifest is written through `files`.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Keep `engines` legal (assert a version, fetch nothing) and ban only the corepack fields.
1. Let the guardrail report and leave the fix to the model: two round trips and a model that can still ship the field if it ignores the failure.
1. Strip the fields in rule_tool_apply only: the receipt would bind content that was never checked, so the check and the write would describe different files.
