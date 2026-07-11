```md
Observation: [what the code currently does]

Risk: [why this can cause a bug, performance issue, or maintenance problem]

Suggested fix: [smallest practical change]

Example:

```typescript
// code sample
```

Rule of thumb: [one reusable sentence]
```

## Example comment

```md
Observation: This component uses `ChangeDetectionStrategy.Default` and manages state through a `BehaviorSubject`.

Risk: Every change detection cycle checks this component and its children, even when nothing relevant changed.

Suggested fix: Set `changeDetection: ChangeDetectionStrategy.OnPush` and consider replacing the `BehaviorSubject` with a `signal()` for simpler, zone-independent state.

Rule of thumb: OnPush + Signals reduce change detection work and make component updates predictable.
```
