## 6. Data Flow Summary

### Complete Tick→DOM Path

```
1. User input → @input handler → store.state.X = Y
2. Proxy trap fires → store.tick.set() (automatic)
3. Signal subscribers invalidate → ComputedSignal marks dirty
4. Microtask flush → render effect runs
5. TemplateInstance.updateWithContext(values, context)
6. Parts write directly to DOM (ChildNodePart, ExprPart, ForPart, etc.)
```

### Synchronous vs Microtask

| Phase | When | What runs |
|-------|------|-----------|
| Sync | During store.tick.set() | Model binding syncs, computed invalidation, effect scheduling |
| Microtask | After current script | Effects (render, document sync) |

---

## Reference

See references/REFERENCE.md for bootstrap sequence, pitfalls, migration guide, guardrails, project scaffolding, forms, and file structure.
