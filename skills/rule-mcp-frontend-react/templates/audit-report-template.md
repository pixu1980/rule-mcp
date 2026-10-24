# React Performance Audit Report

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

```tsx
// optional example
```

## Priority order

1. Correctness and invalid states
2. Render boundary and state ownership
3. Effects and derived values
4. Keys and identity
5. Network frequency vs rendering workload
6. Memoization cleanup
7. Component split and API cleanup

## Measurement suggestions

- React DevTools Profiler for render counts and commit duration
- Browser Performance panel for layout, paint, and scripting cost
- Network panel for request frequency and waterfall
- Targeted logging for unexpected renders during local debugging

## Rules of thumb for the team

- Keep state close to usage
- Do not store what can be calculated
- Use reducer for dependent state
- Use stable keys for changing lists
- Memoize only when the work is actually expensive
- Use `useLayoutEffect` only to prevent visible layout glitches
