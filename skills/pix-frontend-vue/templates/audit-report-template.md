# Vue 3 Performance Audit Report

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

```vue
<!-- optional example -->
```

## Priority order

1. Correctness and reactive tracking
2. Watcher hygiene
3. State ownership and render boundaries
4. Computed vs watcher discipline
5. List keys and identity
6. Component responsibility split
7. Template and Teleport optimization

## Measurement suggestions

- Vue DevTools browser extension: Timeline tab for reactivity events
- Vue DevTools Performance tab: component render timing
- Browser Performance panel: layout, paint, scripting cost

## Rules of thumb for the team

- Use `ref` for primitives, `reactive` for deep objects
- Use `computed` for derived state, not `watch`
- Keep state close to where it is used
- Use stable keys in v-for
- Use Teleport for overlays
- Access template refs only after mount
