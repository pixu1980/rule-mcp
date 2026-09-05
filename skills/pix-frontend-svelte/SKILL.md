---
name: rule-frontend-svelte
description: >-
  Use when building Svelte 5 applications with runes API. Follows rule principles: zero CSS classes, semantic HTML, $state/$derived, barrel file tree.
tags:
  - "frontend"
  - "svelte"
frameworks: [svelte]
---

# rule-frontend-svelte - Svelte 5 with rule Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) and
a store-and-signals architecture to **Svelte 5 runes API**.

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** - only element selectors + `[data-part="..."]` + `[data-*]`
2. **Zero inline styles** - CSS via `<style>` tag in `.svelte` (scoped by Svelte) or external `.css` imports
3. **Flex first** - `display: grid` only for named areas, subgrid, explicit placement, or auto-fit tracks; anything a flex row or column can do is flex.
4. **Semantic HTML is mandatory** - never `<div>` where a semantic element exists
5. **Barrel pattern** - every component folder has `index.js`
6. **`<style>` is the primary mechanism** - Svelte scopes `<style>` tags per component. Use external CSS imports only for truly global styles.

## File Tree Convention

```
src/
├── index.html
├── main.js                          ← mount(App, target)
├── components/
│   ├── TodoList/
│   │   ├── index.js                 ← Barrel
│   │   ├── _TodoList.svelte         ← Svelte component (PascalCase + _ prefix)
│   │   ├── _TodoList.css            ← External CSS
│   │   └── __tests__/
│   └── TodoItem/
│       ├── index.js
│       ├── _TodoItem.svelte
│       ├── _TodoItem.css
│       └── __tests__/
└── stores/
    ├── index.js
    ├── _todos.svelte.js
    └── __tests__/
```

## Component Pattern

Use Svelte's native `<style>` tag for component-scoped CSS.
Svelte scopes styles to the component at compile time - no `adoptedStyleSheets` needed.

```svelte
<!-- components/TodoItem/_TodoItem.svelte -->
<script>
  let { todo, ontoggle, ondelete } = $props();
</script>

<article
  data-part="item"
  data-state-completed={todo.completed ? "done" : ""}
>
  <input
    type="checkbox"
    data-part="toggle"
    bind:checked={todo.completed}
    onchange={() => ontoggle?.(todo.id)}
  />
  <span data-part="title">{todo.title}</span>
  <button data-part="delete" onclick={() => ondelete?.(todo.id)}>
    Delete
  </button>
</article>

<style>
  article[data-part="item"] {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }
  article[data-part="item"][data-state-completed="done"] {
    opacity: 0.6;
  }
</style>
```

## CSS Loading in Svelte

Use the `<style>` tag inside `.svelte` files for component-scoped CSS.
Svelte automatically scopes styles at compile time - rule rules still apply:
no CSS classes, only element + `[data-part]` selectors.

For shared/global CSS, import at module level:

```svelte
<script>
  // Import global styles (applied globally, use sparingly)
  import "../styles/_base.css";
</script>
```

**No `adoptedStyleSheets` needed in Svelte** - the framework handles CSS scoping natively.

## Svelte ↔ store-and-signals mapping

| Store and signals           | Svelte 5 Equivalent                            |
| --------------------------- | ---------------------------------------------- |
| `StateSignal`               | `$state()` rune                                |
| `ComputedSignal`            | `$derived()` rune                              |
| `effect()`                  | `$effect()` rune                               |
| `Store (Proxy)`             | `$state()` object or Svelte store              |
| `tickState` bridge          | `$state()` deep reactivity (automatic)         |
| `html\`\`` tagged templates | Template in `.svelte` file                     |
| `{{ expr \| filter }}`      | `{expression}` + `$derived`                    |
| `${value}`                  | `{value}`                                      |
| `@click=${fn}`              | `onclick={fn}`                                 |
| `model={...}` directive     | `bind:value` / `bind:checked`                  |
| `<for each="x in xs">`      | `{#each xs as x (x.id)}`                       |
| `<if condition="c">`        | `{#if c}`                                      |
| `<switch expr="x">`         | `{#if}` / `{:else if}` chain                   |
| `adoptedStyleSheets`        | `<style>` tag in `.svelte` (scoped by default) |

## Lists and Conditionals

```svelte
<section data-part="list">
  {#if todos.length > 0}
    <ul data-part="items">
      {#each todos as todo (todo.id)}
        <li data-part="item">{todo.title}</li>
      {/each}
    </ul>
  {:else}
    <p data-part="empty">No todos yet.</p>
  {/if}
</section>
```

## State Management - $state as Store

```js
// stores/_todos.svelte.js
let todos = $state([]);

export function getTodos() {
  return todos;
}

export function addTodo(title) {
  todos.push({ id: crypto.randomUUID(), title, completed: false });
}

export function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) todo.completed = !todo.completed;
}
```

## Barrel Pattern

```js
// components/TodoItem/index.js
export { default as TodoItem } from "./_TodoItem.svelte";
```

---

## Guardrails (Testable Assertions)

- [ ] **guardrail-no-css-classes**: CSS uses element + [data-part="..."] + [data-*] selectors only. Zero .class selectors.
- [ ] **guardrail-no-inline-styles**: Templates have zero style="..." attributes. Use `<style>` tag in `.svelte` or external CSS imports.
- [ ] **guardrail-semantic-html**: No <div> where <header>/<section>/<article>/<footer>/<nav>/<main>/<aside>/<form>/<ul>/<ol>/<li> exists.
- [ ] **guardrail-external-css**: CSS in `<style>` tag (scoped by Svelte) or imported global CSS file. No inline styles.
- [ ] **guardrail-barrel-file**: Component folder has index.js barrel. Files: _PascalCase.ext.
- [ ] **guardrail-data-part**: Child elements use data-part="role" instead of class names.
- [ ] **guardrail-no-framework-css**: No CSS-in-JS, no CSS Modules, no Tailwind. Pure external CSS only.
- [ ] **guardrail-svelte-specific**: Follows Svelte 5 rule-frontend-svelte conventions. Use `<style>` tag, runes API, `$props()`, `$state()`, `$derived()`, `$effect()`.
- [ ] **guardrail-jsdoc-required**: Every JS/TS file MUST have complete JSDoc on all exported symbols (see rule-styleguide -> javascript.md).
- [ ] **guardrail-css-comments-required**: Every CSS file MUST have file-level + section comments (see rule-styleguide -> css.md).
- [ ] **guardrail-a11y-test-required**: Every project MUST have Playwright + @axe-core/playwright a11y tests in `tests/a11y/` (see rule-styleguide -> a11y.md -> Automated Testing).

## Project Scaffolding

All rule projects include standard config files. See [`rule-styleguide`](../rule-styleguide/SKILL.md) -> Project Scaffolding.
Use `rule_tool_styleguide mode=scaffold` or `rule_tool_scaffold` to generate: `.prettierrc`, `.nvmrc`, `.editorconfig`,
`.gitignore`, `.eslintrc.json`, `tsconfig.json`, `jsconfig.json`.

---

## Svelte 5 Performance & Best Practices

This section extends rule-frontend-svelte with a structured performance review methodology for Svelte 5 runes API.

### When to activate

- Review Svelte component performance
- Refactor reactive state with runes (`$state`, `$derived`, `$effect`)
- Debug unexpected reactivity or stale values
- Improve slow forms, lists, or large components
- Decide between `$derived`, `$effect`, or `$state` for computed values
- Write PR feedback about Svelte code quality
- Split a large Svelte component into smaller pieces

### Operating principles

1. **Runes are explicit reactivity.** Unlike Svelte 4's implicit `let` reactivity, Svelte 5 runes (`$state`, `$derived`, `$effect`) make reactive boundaries clear.

2. **`$derived` over `$effect` for computation.** `$effect` is for side effects, not derived state.

3. **Classify each issue** as: correctness bug, performance risk, maintainability risk, API design risk, premature optimization.

4. **Keep the smallest safe change first.**

### Review workflow

1. Identify the symptom (stale values, too many re-renders, watcher-like loops, slow lists, large component)
2. Find the owner (`$state` scope, reactive dependency, `$effect` trigger, store ownership)
3. Match to one of the 10 patterns below
4. Explain the risk
5. Propose smallest fix
6. End with a rule of thumb

### The 10 patterns

#### 1. `$derived` for derived values, not `$effect`

`$derived` runs during the reactive update and is cached. `$effect` runs after DOM update and is for side effects.

```svelte
<!-- ❌ Effect for derivation -->
<script>
  let count = $state(0);
  let doubled = $state(0);
  $effect(() => { doubled = count * 2; });
</script>

<!-- ✅ $derived for computation -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

Rule: _`$derived` for computed values. `$effect` for side effects (logging, localStorage, imperative APIs)._

#### 2. Keep `$state` as close as possible to usage

A `$state` update re-renders the component that owns it and any children that read it.

```svelte
<!-- ❌ State in App-unrelated children re-render on search -->
<script>
  let search = $state("");
</script>

<!-- ✅ Extract into SearchSection -->
<!-- SearchSection.svelte -->
<script>
  let search = $state("");
</script>
```

Rule: _Keep `$state` in the smallest component that needs it._

#### 3. Always use keys with `{#each}`

```svelte
<!-- ❌ Index as key - state, focus, animations break on reorder -->
{#each items as item, i (i)}
  <li data-part="item">{item.title}</li>
{/each}

<!-- ✅ Stable ID key -->
{#each items as item (item.id)}
  <li data-part="item">{item.title}</li>
{/each}
```

Rule: _Always provide a stable key expression in `{#each}`. Never use index for mutable lists._

#### 4. Use `{#key}` for intentional component reset

Svelte 5's `{#key expression}` block destroys and recreates its content when the expression changes.

```svelte
{#key selectedUserId}
  <UserForm {selectedUserId} />
{/key}
```

Rule: _Use `{#key}` to fully reset a component instead of manually reseting every internal value._

#### 5. Use snippets (`{#snippet}`) for reusable template logic

Svelte 5 snippets replace slot-based patterns and are more efficient.

```svelte
{#snippet itemTemplate(item)}
  <li data-part="item">
    <span data-part="title">{item.title}</span>
  </li>
{/snippet}

{#each items as item (item.id)}
  {@render itemTemplate(item)}
{/each}
```

Rule: _Use `{#snippet}` for reusable template fragments. They are compiled, not runtime._

#### 6. One responsibility = one reason to change

Split when data fetching, formatting, state transitions, and UI rendering change for different reasons.

```svelte
<!-- ✅ Use a store/module pattern -->
<script>
  import { getUsers } from "./_users.svelte.js";
  let users = $state([]);
  let loading = $state(true);

  $effect(() => { getUsers().then(u => { users = u; loading = false; }); });
</script>

<!-- View only -->
{#if loading}
  <p>Loading...</p>
{:else}
  <h1>{users[0]?.name}</h1>
{/if}
```

Rule: _Split when different changes affect different parts._

#### 7. `$effect` must clean up resources

Every `$effect` that sets up timers, event listeners, subscriptions, or observers must return a cleanup function.

```svelte
<script>
  let count = $state(0);

  $effect(() => {
    const timer = setInterval(() => count++, 1000);
    return () => clearInterval(timer); // ✅ cleanup
  });
</script>
```

Rule: _Every `$effect` with persistent side effects must return a cleanup function._

#### 8. Prefer `$derived` over `$state` + `$effect` for async resources with `$effect`

Use `$state` + `$effect` for manual async, or a store pattern with proper lifecycle.

```svelte
<script>
  let userId = $state(props.userId);
  let user = $state(null);
  let error = $state(null);

  $effect(() => {
    const id = userId;
    let cancelled = false;
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) user = data; })
      .catch(e => { if (!cancelled) error = e.message; });
    return () => { cancelled = true; };
  });
</script>
```

Rule: _Handle race conditions in async `$effect` via cancellation flags or AbortController._

#### 9. Avoid `$state` for what can be derived

Don't store values that can be calculated from other reactive state.

```svelte
<!-- ❌ Storing derived values -->
<script>
  let firstName = $state("");
  let lastName = $state("");
  let fullName = $state("");
  $effect(() => { fullName = firstName + " " + lastName; });
</script>

<!-- ✅ Derive with $derived -->
<script>
  let firstName = $state("");
  let lastName = $state("");
  let fullName = $derived(firstName + " " + lastName);
</script>
```

Rule: _If a value can be computed from existing `$state`, use `$derived`. Don't store what you can compute._

#### 10. Use Svelte stores (`.svelte.js` files) for shared state

Shared reactive state belongs in `.svelte.js` module files or stores, not in component-scoped `$state`.

```js
// stores/_todos.svelte.js
let todos = $state([]);

export function getTodos() {
  return todos;
}
export function addTodo(title) {
  todos = [...todos, { id: crypto.randomUUID(), title, completed: false }];
}
```

Rule: _Component `$state` for local state. `.svelte.js` module `$state` for shared state._

### Decision matrix

| Symptom                           | Check first        | Likely pattern                   | Fix                          |
| --------------------------------- | ------------------ | -------------------------------- | ---------------------------- |
| Derived value stale               | Derivation method  | `$effect` used for computation   | Use `$derived`               |
| Effect runs more than expected    | Dependencies       | Unstable reactive dep in $effect | Stabilize dep or check scope |
| List loses focus on reorder       | Key                | No `{#each}` key or index key    | Add stable key expression    |
| Component keeps stale form data   | Identity           | Missing reset                    | Use `{#key entityId}`        |
| Sibling re-renders on input       | State owner        | `$state` too high                | Move state down              |
| Memory leak on route change       | Effect cleanup     | Missing cleanup return           | Add cleanup to `$effect`     |
| Race condition in fetch           | Async effect       | No cancellation flag             | Add `AbortController`        |
| Storing what can be computed      | State choice       | `$state` + `$effect` for derived | Use `$derived`               |
| Large component is hard to change | Responsibilities   | Mixed concerns                   | Extract store + view         |
| Shared state scattered            | Store architecture | Component-scoped shared state    | Use `.svelte.js` module      |

### Supporting resources

| Resource               | Path                                            |
| ---------------------- | ----------------------------------------------- |
| 10 detailed examples   | `examples/performance/01-*.md` ... `10-*.md`    |
| PR review checklist    | `checklists/svelte-performance-pr-checklist.md` |
| Decision matrix        | `checklists/decision-matrix.md`                 |
| System prompt          | `prompts/portable-system-prompt.md`             |
| Code review prompt     | `prompts/code-review-prompt.md`                 |
| Refactor prompt        | `prompts/refactor-prompt.md`                    |
| Teaching prompt        | `prompts/teaching-prompt.md`                    |
| Audit report template  | `templates/audit-report-template.md`            |
| PR comment template    | `templates/pr-comment-template.md`              |
| Refactor plan template | `templates/refactor-plan-template.md`           |
| Performance playbook   | `knowledge/svelte-performance-playbook.md`      |

---

## Forms (Svelte 5)

### Prerequisites

- Use `sveltekit-superforms` + `zod` for form handling
- Use `$state()` runes for reactive form state

### Step 1 - Define form with validation

```svelte
<script lang="ts">
  import { superForm } from "sveltekit-superforms";
  import { zod } from "sveltekit-superforms/adapters";
  import { z } from "zod";

  const schema = z.object({
    email: z.string().email(),
    name: z.string().min(2).max(255),
  });

  const form = superForm(
    { email: "", name: "" },
    { validators: zod(schema) }
  );

  const { data, errors, submit, submitting } = form;
</script>

<form data-part="form" method="POST" use:submit>
  <label data-part="field">
    <span data-part="label">Email</span>
    <input data-part="input" type="email" bind:value={data.email} />
    {#if errors.email}
      <span data-part="error">{errors.email}</span>
    {/if}
  </label>
  <button data-part="submit" disabled={submitting}>
    {submitting ? "Saving..." : "Save"}
  </button>
</form>
```

### Checklist

- [ ] `sveltekit-superforms` + `zod` in use
- [ ] Schema validation covers full form
- [ ] `bind:value` for controlled inputs
- [ ] Field-level errors rendered
- [ ] Submission guarded with `submitting`

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-frontend](../rule-frontend/SKILL.md) - Frontend skill index
- [rule-styleguide](../rule-styleguide/SKILL.md) - Shared frontend standards
