# SolidJS Performance Audit Report

## Summary

Short summary of the most important performance and maintainability findings.

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

1. Correctness and broken reactivity
2. Control flow components
3. Derived values and memoization
4. State ownership
5. Async data patterns
6. Effect cleanup
7. Component split

## Measurement suggestions

- SolidJS DevTools: signal value inspection, effect tracking
- Browser Performance panel: scripting cost

## Rules of thumb for the team

- Never destructure props
- <For> over .map(), <Show> over ternary
- createMemo for expensive work
- createStore for nested state
- createResource for async
- onCleanup for every effect with resources
