# 081: Install/uninstall rework keeps current stack, steps and contents only

- **Date**: 2026-09-14
- **Status**: accepted
- **Tags**: install, wizard, architecture
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

Install/uninstall review: Ink 7 fullscreen wizard (node >= 22) plus plain runner (node 20 floor), shell scripts install.sh and install.ps1, per-agent writers under src/cli/installers/. Voted goals: simplicity plus control plus robustness for a single developer, with wizard and flags kept perfectly in sync.

## Decision

The install/uninstall rework changes wizard steps and contents only (order, copy, offered choices, validation). Frozen: dependencies (Ink 7, toolchain), rendering system (fullscreen wizard plus plain runner with the same defaults), node floors 20 and 22, setup and installers architecture.

## Consequences

Upside: minimal regression risk, no dependency churn, the plain runner stays free. Downside: known structural limits (for example post-registration minimal enforcement, port architecture) stay out of scope for other runs.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Rewrite the wizard on a new renderer
1. Change the Node floor or toolchain as part of the rework
