# Svelte 5 Performance Playbook

This playbook supports the rule-mcp-frontend-svelte performance review skill. It covers Svelte 5 runes, `{#key}`, snippets, and component architecture.

## Mental model

Svelte 5 introduces **runes** (`$state`, `$derived`, `$effect`) - explicit reactive primitives that replace Svelte 4's implicit `let =` reactivity.

Key differences from Svelte 4:

- `$state()` is explicit - no more `let count = 0` magic
- `$derived()` replaces `$:` reactive declarations
- `$effect()` replaces `$:` for side effects and adds cleanup

## Pattern 1 - $derived over $effect

The most common Svelte 5 anti-pattern is using `$effect` to derive state.

```svelte
<script>
  // ❌ Effect for derivation
  let count = $state(0);
  let doubled = $state(0);
  $effect(() => { doubled = count * 2; });
</script>

<script>
  // ✅ $derived for computation
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

### When to use each

| Tool            | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `$state()`      | Mutable local reactive state                               |
| `$derived()`    | Computed values from other reactive state                  |
| `$derived.by()` | Complex multi-statement derived values                     |
| `$effect()`     | Side effects: sync, logging, localStorage, imperative APIs |

## Pattern 2 - State locality

A `$state` update triggers the component that owns it to update. Children that read the state also update.

```svelte
<!-- App.svelte - don't put search state here -->
<script>
  import Search from './Search.svelte';
  import Dashboard from './Dashboard.svelte';
</script>

<Search />
<Dashboard /> <!-- won't re-render on search changes -->
```

```svelte
<!-- Search.svelte - state lives where it's used -->
<script>
  let search = $state('');
</script>
<input bind:value={search} />
```

## Pattern 3 - {#each} keys

Without a key, Svelte updates list items by index. Adding a key matches items across renders by identity.

```svelte
<!-- ❌ Index key - state, focus, animations break -->
{#each items as item, i (i)}
  <li>{item.name}</li>
{/each}

<!-- ✅ Stable ID key -->
{#each items as item (item.id)}
  <li>{item.name}</li>
{/each}

<!-- ✅ For primitive arrays, use the value itself -->
{#each names as name (name)}
  <li>{name}</li>
{/each}
```

## Pattern 4 - {#key} for component reset

`{#key expression}` destroys and recreates children when the expression changes.

```svelte
<!-- Helps with forms, animations, entity-specific data -->
{#key pageId}
  <Editor pageId={pageId} />
{/key}
```

This is cleaner than manually resetting every piece of state in `$effect`.

## Pattern 5 - Snippets

Snippets are reusable template fragments compiled at build time. They replace slot-based patterns with better performance.

```svelte
{#snippet card(item)}
  <article data-part="card">
    <h3>{item.title}</h3>
    <p>{item.description}</p>
  </article>
{/snippet}

{#each items as item (item.id)}
  {@render card(item)}
{/each}
```

Snippets can be passed to other components:

```svelte
<DataTable data={items}>
  {#snippet row(item)}
    <td>{item.name}</td>
    <td>{item.value}</td>
  {/snippet}
</DataTable>
```

## Pattern 6 - Component responsibility

### Signs of mixed responsibility

- Component changes when the API contract changes and when the UI design changes
- Data fetching, formatting, loading/error states, and event handlers are all in one file

### Extract pattern

```js
// stores/_user.svelte.js
let currentUser = $state(null);
let loading = $state(false);
let error = $state(null);

export function getUser() {
  return currentUser;
}
export function isLoading() {
  return loading;
}
export function getError() {
  return error;
}

export async function loadUser(id) {
  loading = true;
  error = null;
  try {
    currentUser = await fetch(`/api/users/${id}`).then((r) => r.json());
  } catch (e) {
    error = e.message;
  } finally {
    loading = false;
  }
}
```

```svelte
<!-- UserProfile.svelte - view only -->
<script>
  import { getUser, isLoading, getError, loadUser } from './stores/_user.svelte.js';
  let { userId } = $props();

  $effect(() => { loadUser(userId); });
</script>

{#if isLoading()}
  <p>Loading...</p>
{:else if getError()}
  <p>Error: {getError()}</p>
{:else}
  <h1>{getUser()?.name}</h1>
{/if}
```

## Pattern 7 - $effect cleanup

`$effect` can return a cleanup function that runs when the component unmounts or before the effect re-runs.

```svelte
<script>
  let id = $state(0);

  $effect(() => {
    const controller = new AbortController();
    fetch(`/api/data/${id}`, { signal: controller.signal });

    return () => controller.abort(); // ✅ cleanup
  });

  $effect(() => {
    const ws = new WebSocket(url);
    ws.onmessage = (e) => messages = [...messages, e.data];
    return () => ws.close(); // ✅ cleanup
  });
</script>
```

## Pattern 8 - Async $effect with cancellation

Race conditions happen when async effects resolve out of order.

```svelte
<script>
  let { userId } = $props();
  let user = $state(null);

  $effect(() => {
    const id = userId;
    let cancelled = false;

    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) user = data; });

    return () => { cancelled = true; };
  });
</script>
```

Or use `AbortController`:

```svelte
$effect(() => {
  const controller = new AbortController();

  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then(r => r.json())
    .then(data => { user = data; })
    .catch(err => {
      if (err.name !== 'AbortError') error = err.message;
    });

  return () => controller.abort();
});
```

## Pattern 9 - Don't store what you can derive

```svelte
<script>
  let firstName = $state('John');
  let lastName = $state('Doe');

  // ❌ Storing derivable state
  let fullName = $state('');
  $effect(() => { fullName = firstName + ' ' + lastName; });

  // ✅ Derive
  let fullName = $derived(firstName + ' ' + lastName);
</script>
```

## Pattern 10 - Shared state in .svelte.js modules

`.svelte.js` files are compiled to use Svelte's reactive runtime. They are the correct place for shared state.

```js
// stores/_counter.svelte.js
let count = $state(0);

export function getCount() {
  return count;
}
export function increment() {
  count++;
}
export function decrement() {
  count--;
}
```

Components import these functions directly:

```svelte
<script>
  import { getCount, increment } from './stores/_counter.svelte.js';
</script>

<button onclick={increment}>{getCount()}</button>
```

## Measurement notes

Use browser Performance panel for scripting, layout, and paint cost.

Svelte 5 compiles to efficient vanilla JS - the main performance concerns are:

- Async `$effect` race conditions (correctness)
- Missing `{#each}` keys
- State scope too broad
- Missing `$effect` cleanup

## Final principle

Svelte 5's runes API makes reactivity explicit. Use `$derived` for computation, `$effect` for side effects, and keep `$state` as close as possible to where it's read.
