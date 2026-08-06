# Vue 3 Performance Playbook

This playbook supports the rule-frontend-vue performance review skill. It gives agents and reviewers a practical way to diagnose Vue 3 performance problems.

## Mental model

Vue 3 performance is usually about three questions:

1. What reactive state changed?
2. Which components re-ran their render because of that change?
3. Was that re-render necessary?

## Pattern 1 — Reactive container choice

`ref()` wraps a value in a reactive object with `.value`. `reactive()` makes an object deeply reactive. `shallowRef()` / `shallowReactive()` skip deep proxy wrapping.

### Rules

- **Primitives** → always `ref()`. `reactive(0)` is not reactive.
- **Objects updated by replacement** → `ref()` or `shallowRef()`. Setting `ref.value = newObj` triggers reactivity.
- **Deeply nested objects with frequent property updates** → `reactive()`.
- **Large data fetched from API** → `shallowRef()`. Replace the whole value, don't mutate deeply.
- **Arrays** → `ref([])`. Use `.value = [...]` for replacement.
- **Sets/Maps** → `reactive(new Map())` or `ref(new Set())`.

### Pitfall: destructuring reactive

```ts
const state = reactive({ x: 1, y: 2 });
const { x, y } = state; // ❌ x and y are not reactive
```

Fix: use `toRefs()`:

```ts
const { x, y } = toRefs(state); // ✅ x and y are Refs
```

## Pattern 2 — Watch discipline

### When to use what

| Situation                              | Tool            |
| -------------------------------------- | --------------- |
| Derive state from reactive state       | `computed()`    |
| Fire side effect when deps change      | `watch()`       |
| Fire side effect that auto-tracks deps | `watchEffect()` |
| Fire side effect on every render       | No — redesign   |

### Watch loop prevention

Never mutate a reactive value inside `watch` that changes a dependency of the same watcher.

```ts
// ❌ Loop risk
watch(count, (v) => {
  if (v > 5) threshold.value = v;
});
watch(threshold, (v) => {
  count.value = v * 2;
});
```

### Cleanup

`watch` and `watchEffect` return a stop handle:

```ts
const stop = watchEffect(() => {
  /* ... */
});
onUnmounted(stop); // ✅ Manual cleanup
// or let Vue auto-stop when component unmounts
```

## Pattern 3 — Computed before watch

Computed values are lazy, cached, and only re-evaluate when their dependencies change. They are always preferred over `watch` for derived state.

```ts
// ❌ Watch for deriving
const search = ref("");
const results = ref([]);
watch(search, (q) => {
  results.value = items.filter((i) => i.name.includes(q));
});

// ✅ Computed for deriving
const search = ref("");
const results = computed(() => items.filter((i) => i.name.includes(search.value)));
```

Note: `computed` is reactive — passing `results.value` to a child component will re-render only when `results` changes.

## Pattern 4 — State locality

A `ref()` or `reactive()` update causes the owning component and its children to re-render.

### Symptom

A parent owns `search` state. A heavy `<Dashboard>` sibling re-renders on every keystroke.

### Fix

Move the state into the component that renders the search input and results.

```vue
<!-- App.vue — no search state -->
<script setup>
import SearchSection from "./SearchSection.vue";
import HeavyDashboard from "./HeavyDashboard.vue";
</script>
<template>
  <SearchSection />
  <HeavyDashboard />
</template>
```

## Pattern 5 — List keys

Vue uses `:key` to match vnodes across re-renders. Changing list order with index keys causes state to be reused on the wrong DOM nodes.

### Always stable keys

```vue
<li v-for="item in items" :key="item.id">
```

### Acceptable index exception

Only when the list is truly static: no insert, delete, reorder, filter, sort, and no stateful children (inputs, focus, animations).

## Pattern 6 — Key reset

Changing `:key` destroys and recreates the component. This is the cleanest way to reset form state, restart animations, or discard local state when the selected entity changes.

```vue
<UserForm :key="selectedUserId" :user-id="selectedUserId" />
```

## Pattern 7 — Provide/inject over prop drilling

Props should flow from parent to direct child. When data must reach deeply nested components, use `provide`/`inject`.

```ts
// Ancestor
import { provide, ref } from "vue";
const theme = ref("dark");
provide("theme", { theme, setTheme: (t) => (theme.value = t) });

// Descendant
import { inject } from "vue";
const { theme, setTheme } = inject("theme");
```

### Best practices

- Use injection keys (Symbol or string) as constants
- Consider `readonly()` for exposed state to prevent unintended mutations
- Default inject values for optional context

## Pattern 8 — Component responsibility

### Signs of mixed responsibility

- Component changes when the API contract changes
- Same component changes when the UI design changes
- Data fetching, formatting, error states, and event handlers live in the same file

### Extract pattern

```ts
// composables/useUserData.js
export function useUserData(userId) {
  const data = ref(null);
  const isLoading = ref(true);
  const error = ref(null);

  watchEffect(async () => {
    isLoading.value = true;
    try {
      data.value = await fetchUser(userId.value);
      error.value = null;
    } catch (e) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  });

  return { data: readonly(data), isLoading: readonly(isLoading), error: readonly(error) };
}
```

## Pattern 9 — Teleport

`<Teleport to="body">` moves DOM nodes to a different part of the DOM tree. This is essential for modals, tooltips, dropdowns, and overlays that might be clipped by `overflow: hidden` or z-index stacking contexts on ancestors.

```vue
<Teleport to="body">
  <div v-if="show" data-part="modal-backdrop">
    <article data-part="modal">
      <slot />
    </article>
  </div>
</Teleport>
```

## Pattern 10 — Template refs lifecycle

Template refs are set after the component mounts and are cleared before unmounting. They are `null` during the initial render, `onBeforeUpdate`, and `onUpdated`.

### Safe access pattern

```vue
<script setup>
const inputRef = ref(null);

onMounted(() => {
  inputRef.value?.focus();
});

function validate() {
  if (!inputRef.value) return; // guard against unmounted
  inputRef.value.setCustomValidity("");
}
</script>
<template>
  <input ref="inputRef" data-part="field" />
</template>
```

## Measurement notes

Use Vue DevTools browser extension for:

- Component tree and state inspection
- Timeline tab for reactivity events and watcher triggers
- Performance tab for component render timing

Use browser Performance panel for layout and paint cost.

## Final principle

Vue 3's reactivity system is powerful but has sharp edges. Understanding when tracking happens (access during a reactive effect) and when it doesn't (after destructuring, outside an effect) is the key to avoiding most performance and correctness bugs.
