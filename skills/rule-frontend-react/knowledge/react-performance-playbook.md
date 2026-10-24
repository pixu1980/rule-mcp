# React Performance Playbook

This playbook supports the React Performance Pattern Reviewer Skill. It gives agents and reviewers a practical way to diagnose React performance problems without jumping directly to premature optimization.

## Mental model

React performance work is usually about three questions:

1. What changed?
2. Which components had to render because of that change?
3. Was that rendering necessary?

Before suggesting memoization, inspect state placement, derived values, effects, keys, identity, and component boundaries.

## Pattern 1 - Dependent state should transition together

When state values describe the same lifecycle, do not update them as separate facts.

Common risky state groups:

- `loading`, `error`, `data`
- `isOpen`, `selectedId`, `selectedItem`
- `step`, `isSubmitting`, `submitError`
- `dirty`, `values`, `validationErrors`

Recommended shapes:

```tsx
type FetchState<T> =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: string };
```

This makes invalid combinations harder to express.

## Pattern 2 - Rendering work is not network work

`useTransition` tells React that an update is non-urgent. It helps keep urgent updates, such as typing, responsive while React processes heavier UI updates.

Debounce delays execution until changes stop happening for a configured time. It is useful for requests, analytics, autosave, resize handlers, and other repeated work.

Use this decision:

```txt
Is the server being called too often?
  yes -> debounce, throttle, cancellation, caching
  no -> continue

Is React rendering too much local UI work?
  yes -> useTransition, split render boundaries, virtualize huge lists
  no -> continue

Is both happening?
  yes -> debounce network work and transition heavy rendering work
```

## Pattern 3 - State locality creates render boundaries

A state update re-renders the component that owns it and then reconciles its children. If state is higher than needed, unrelated branches participate in the update.

Before using `React.memo`, ask:

- Can the state move down?
- Can the heavy child move out of the state owner?
- Can children be passed as stable composition instead of recreated in the same component?

Good structure:

```tsx
function Page() {
  return (
    <>
      <LocalSearch />
      <ExpensiveDashboard />
    </>
  );
}
```

## Pattern 4 - Effects synchronize with external systems

Do not use effects to mirror state into other state when the value can be calculated.

Bad categories:

- Formatting a name
- Filtering a list that is cheap enough to calculate during render
- Calculating totals
- Deriving flags such as `isValid`

Good categories:

- Event listener setup and cleanup
- Subscription setup and cleanup
- Imperative browser API calls
- localStorage writes
- Document title updates
- Fetching when no dedicated data layer is available

Question:

```txt
Would this code still make sense if React rendered the component twice?
```

If not, the effect likely needs cleanup, guards, or a different design.

## Pattern 5 - Keys preserve identity

React uses keys to match previous and next children. Bad keys cause state to stick to the wrong item.

Avoid:

```tsx
items.map((item, index) => <Row key={index} item={item} />);
```

Prefer:

```tsx
items.map((item) => <Row key={item.id} item={item} />);
```

Index is acceptable only when all are true:

- The list is static
- The list never reorders
- The list never inserts or deletes items
- Items have no local state, focus, animation, or uncontrolled inputs

## Pattern 6 - Keys can intentionally reset identity

A changed key means the old component instance is removed and a new one is mounted.

Use this for:

- Entity-specific forms
- Wizard restart
- Animation restart
- Local component cache reset

Avoid using effects to manually reset a dozen fields when component identity is the actual concept.

## Pattern 7 - Memoization has a cost

`useMemo` runs dependency comparison on each render. It also makes code more complex. Use it when that trade-off is worth it.

Good reasons:

- Expensive calculation
- Large list transformation
- Stable object or array needed for a memoized child
- Preventing expensive child work where identity matters

Weak reasons:

- Joining strings
- Simple math
- Creating a tiny label
- Formatting a trivial boolean

Always avoid mutation:

```tsx
const sorted = useMemo(() => [...items].sort(compareItems), [items]);
```

## Pattern 8 - Responsibility is about reasons to change

A component can look like it does one feature while still having many reasons to change.

Split when changes come from different directions:

- API contract changes
- Data fetching strategy changes
- Loading and error UX changes
- Visual layout changes
- Formatting rules change
- User interaction rules change

Useful split:

```txt
useFeatureData -> loading, error, fetch, cache integration
FeatureView -> rendering and interaction
FeatureEmptyState -> empty UI
FeatureErrorState -> error UI
```

Do not split randomly. Split by reason to change.

## Pattern 9 - Pre-paint layout work is rare but real

`useEffect` runs after paint. `useLayoutEffect` runs after DOM mutations but before paint.

Use `useLayoutEffect` when all are true:

- You must read layout, such as size or position
- You must write layout or style immediately based on that measurement
- The user would see a wrong frame otherwise

Do not use it for data fetching, subscriptions, or ordinary side effects.

## Pattern 10 - Component APIs should compose

Prop soup happens when one component tries to support every variation with flags and render props.

Warning signs:

- More props are added for every feature request
- Boolean props interact in confusing ways
- The component needs many `if` branches to render variants
- One item needs custom behavior but the API applies to all items

Composition lets the caller own structure while the component owns shared behavior.

Good API qualities:

- Small primitives
- Clear nesting
- Customization by children
- Shared behavior through context when needed
- Escape hatches only when necessary

## Review severity guide

### Correctness

Bugs that can show wrong data, lose user input, attach state to the wrong item, or produce invalid UI states.

Examples:

- Index key in editable list
- Stale error with fresh data
- Missing cleanup causing duplicate subscriptions

### Performance

Problems that make interaction slower or render more than necessary.

Examples:

- State too high
- Heavy local filtering without transition
- Repeated network calls without debounce

### Maintainability

Problems that make future changes risky.

Examples:

- Large component with multiple reasons to change
- Effects used as control flow
- Reducer-worthy state scattered across many setters

### API design

Problems that make reusable components hard to use or customize.

Examples:

- Prop soup
- Render prop explosion
- Boolean flags that conflict

### Visual glitch

Problems visible to users for one or more frames.

Examples:

- Tooltip jumps after paint
- Popover measures after first paint

### Premature optimization

Optimizations that add complexity without solving real work.

Examples:

- `useMemo` for string concatenation
- `React.memo` everywhere without render evidence

## Measurement notes

Use measurement when the claim is about speed rather than correctness.

Recommended tools:

- React DevTools Profiler for render counts and commit duration
- Browser Performance panel for scripting, layout, paint, and long tasks
- Network panel for repeated requests and waterfall
- Console render markers only for local debugging, not as final proof

## Agent response patterns

### For code review

```md
Observation: [specific code behavior]

Risk: [specific failure or cost]

Suggested fix: [smallest change]

Rule of thumb: [general lesson]
```

### For refactor

```md
The main issue is [pattern]. I would first [smallest fix], then [larger optional cleanup].
```

### For teaching

```md
The mistake is not that the hook is bad. The mistake is using it for the wrong kind of work.
```

## Final principle

Most React performance fixes start by making data flow clearer. Cleaner ownership often beats clever optimization.
