# SolidJS Performance Playbook

This playbook supports the rule-frontend-solidjs performance review skill. It covers SolidJS's fine-grained reactivity model and common anti-patterns.

## Mental model

SolidJS compiles your JSX into real DOM nodes and updates them granularly when signals change. The key insight: **signals track where they are read, not where they are declared.**

Common bugs come from:

1. Breaking the reactive chain (destructuring, accessing outside tracking scope)
2. Using wrong control flow components
3. Missing memoization for derived values
4. Not cleaning up side effects

## Pattern 1 - Never destructure props

SolidJS wraps props in a reactive proxy. Destructuring reads the value once and loses reactivity.

### Correct patterns

```jsx
// ✅ Direct access - reactive
function Item(props) {
  return <span>{props.name}</span>;
}

// ✅ Split props with mergeProps
function Item(props) {
  const { className, ...rest } = mergeProps({ className: "default" }, props);
  return <span class={className}>{rest.name}</span>;
}

// ✅ Default props
function Item(props) {
  const p = mergeProps({ completed: false }, props);
  return <span data-completed={p.completed}>{p.title}</span>;
}
```

## Pattern 2 - Control flow components

SolidJS provides `<For>`, `<Show>`, `<Switch>`, `<Match>`, `<Index>`, `<Portal>`, `<Dynamic>`, `<ErrorBoundary>`. These are compiled to efficiently create and update DOM nodes.

### Why not `.map()` on signals

```jsx
// ❌ items() is a signal - .map() returns a new array on every signal change
// Solid's JSX compiler treats arrays of elements as static children
<ul>{items().map(item => <li>{item}</li>)}</ul>

// ✅ <For> diffs by key and minimizes DOM operations
<ul>
  <For each={items()}>{(item, index) =>
    <li>{item.title}</li>
  }</For>
</ul>
```

### Keyed vs unkeyed

`<For>` is keyed (requires stable identity). `<Index>` is unkeyed (uses index). Use `<Index>` for static lists where you need access to the index value.

## Pattern 3 - createMemo discipline

`createMemo` lazily evaluates and caches until dependencies change.

```jsx
// ❌ Recalculates on every access
function total() {
  return cart.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Caches until cart changes
const total = createMemo(() => cart.reduce((sum, item) => sum + item.price, 0));
```

### Rules

- Memoize when the computation is O(n) or more
- Memoize when returning an object/array that is passed as props to children (referential stability)
- Don't memoize simple value access or concatenation

## Pattern 4 - createSignal vs createStore

| Situation                                 | Choice                                |
| ----------------------------------------- | ------------------------------------- |
| Primitive value (number, string, boolean) | `createSignal`                        |
| Single-level object                       | Either                                |
| Nested object with frequent deep updates  | `createStore`                         |
| Array with nested objects                 | `createStore`                         |
| Large immutable data replaced entirely    | `createSignal` with whole-replacement |

```js
// Signal: simple, whole-replacement
const [user, setUser] = createSignal({ name: "Alice", age: 30 });
setUser({ name: "Bob", age: 25 }); // whole new object

// Store: deep, partial updates
const [state, setState] = createStore({ items: [], filter: "all" });
setState("items", 0, "completed", true); // nested path update
```

## Pattern 5 - createResource for async

Manual fetch + signal is error-prone. `createResource` handles loading, error, refetch, and integrates with `<Suspense>`.

```jsx
const [data, { mutate, refetch }] = createResource(
  () => props.userId, // source signal (re-fetches on change)
  async (userId) => {
    // fetcher
    const res = await fetch(`/api/users/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  },
);

// Usage
<Show when={!data.loading} fallback={<p>Loading...</p>}>
  <pre>{JSON.stringify(data())}</pre>
</Show>;
```

## Pattern 6 - State locality

Signals create reactive boundaries. A signal update re-executes only the effects and JSX expressions that read it.

```jsx
function Page() {
  return (
    <>
      <SearchSection />
      <ExpensiveDashboard /> {/* Won't re-run on search changes */}
    </>
  );
}

function SearchSection() {
  const [search, setSearch] = createSignal("");
  return <input value={search()} onInput={(e) => setSearch(e.target.value)} />;
}
```

## Pattern 7 - onCleanup discipline

Every effect that creates a resource must clean it up.

```jsx
createEffect(() => {
  const ws = new WebSocket(props.url);
  ws.onmessage = (e) => setMessages(JSON.parse(e.data));

  onCleanup(() => ws.close());
});
```

Common resources that need cleanup: intervals, event listeners, WebSockets, observer subscriptions, async operation cancel tokens.

## Pattern 8 - untrack

`untrack()` reads a signal without subscribing to it. Use it to prevent an effect from re-running when a particular signal changes.

```jsx
createEffect(() => {
  // Re-run only when items changes
  saveToDb(items());
  // Read search without making it a dependency
  console.log("Last search:", untrack(search));
});
```

## Pattern 9 - Component responsibility

Signals, effects, and JSX should be separated by concern, not by file size.

### Extract pattern

```jsx
// Hook (reactive data logic)
function useFilteredItems(items, filter) {
  return createMemo(() => {
    const f = filter();
    return items().filter((item) => (f === "all" ? true : item.status === f));
  });
}

// Component (UI only)
function FilterableList(props) {
  const [filter, setFilter] = createSignal("all");
  const filteredItems = useFilteredItems(() => props.items, filter);
  return <For each={filteredItems()}>{(item) => <li>{item.title}</li>}</For>;
}
```

## Pattern 10 - JSX Expressions vs Control Flow

Solid's JSX compiler wraps every `{}` expression in a reactive scope. But for lists and conditionals, the control flow components are more efficient because they handle granular updates.

```jsx
// ❌ Inefficient: ternary creates new nodes on every branch switch
{
  loading() ? <Spinner /> : <Content />;
}

// ✅ Efficient: Show mounts/unmounts once
<Show when={!loading()} fallback={<Spinner />}>
  <Content />
</Show>;
```

## Measurement notes

Use SolidJS DevTools browser extension for:

- Signal value inspection
- Effect and memo dependency tracking
- Component render timing

Use browser Performance panel for scripting, layout, and paint cost.

## Final principle

SolidJS is already fine-grained. The most common performance bugs are reactivity breaks (destructuring, wrong control flow, missing memo). Fix those first before adding any manual optimization.
