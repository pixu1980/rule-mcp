# Svelte 5 Performance Audit Report

## Summary

## Highest-impact finding

## Findings

### 1. Finding title

- Pattern:
- Severity:
- Location:
- Risk:
- Suggested fix:
- Effort: small | medium | large
- Confidence: low | medium | high

## Priority order

1. Correctness (race conditions, memory leaks)
2. $derived vs $effect discipline
3. State ownership
4. List keys and {#key}
5. Effect cleanup
6. Component split

## Rules of thumb for the team

- $derived for computation, $effect for side effects
- Keep $state low
- Stable keys in {#each}
- {#key} for reset
- Clean up every $effect
