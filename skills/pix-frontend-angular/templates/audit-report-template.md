# Angular Performance Audit Report

## Summary

Short summary of the most important performance and maintainability findings.

## Highest-impact finding

Describe the single fix likely to produce the most noticeable improvement.

## Findings

### 1. Finding title

- Pattern:
- Severity:
- Location:
- Risk:
- Suggested fix:
- Effort: small | medium | large
- Confidence: low | medium | high

```typescript
<!-- optional example -->
```

## Priority order

1. Correctness and memory leaks
2. Change detection strategy
3. State ownership
4. Derived values and computed
5. List tracking
6. Lazy loading and @defer
7. Component split

## Measurement suggestions

- Angular DevTools Profiler: record change detection cycles
- Browser Performance panel: scripting, layout, paint cost

## Rules of thumb for the team

- OnPush on every component
- Signals for local state
- track every @for
- computed() for derived values
- Clean up every subscription
- Lazy-load every route
