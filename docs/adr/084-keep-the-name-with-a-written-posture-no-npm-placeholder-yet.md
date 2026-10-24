# 084: Keep the name with a written posture, no npm placeholder yet

- **Date**: 2026-09-10
- **Status**: accepted
- **Tags**: naming, legal
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

OSS-26: the project name is neither protectable nor claimed. RuleMCP is a common product word, and both the npm package name and the io.github.rule-mcp registry namespace are unclaimed. The registry side is settled by ADR 081 (owner namespace); the npm side cannot settle the same way because publication is out of scope.

## Decision

Keep the rule-mcp name with a written trademark posture (TRADEMARK.md) instead of a filing. No npm placeholder is published now; the squat risk is recorded here openly. Revisit on 2027-03-10 or when npm publication returns to scope, whichever comes first.

## Consequences

TRADEMARK.md states the boundary; README links it next to the license; the npm placeholder decision stays an explicit open owner item with a review date.

## What would end this

The assumption this leans on, and the observation that would make it wrong.

## Alternatives Considered

1. Claim trademark protection now (rejected: premature for an unregistered name on an unfunded single-maintainer project)
1. Decide the npm placeholder in this ADR (rejected: owner deferred the call; the risk is recorded here instead of silently left)
