---
name: rule-frontend-vue
description: >-
  Use when building Vue 3 Composition API components. Follows rule principles: zero CSS classes, semantic HTML, barrel file tree, data-part selectors.
tags:
  - "frontend"
  - "vue"
frameworks: [vue]
guardrails: [vue-no-class-binding]
---

# rule-frontend-vue - Vue 3 with rule Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) and
a store-and-signals architecture to **Vue 3 Composition API**.

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** - only element selectors + `[data-part="..."]` + `[data-*]` attribute selectors
2. **Zero inline styles** - all styling in external `.css` files via `adoptedStyleSheets`
3. **Flex first** - `display: grid` only for named areas, subgrid, explicit placement, or auto-fit tracks; anything a flex row or column can do is flex.
4. **Semantic HTML is mandatory** - never `<div>` where a semantic element exists
5. **Barrel pattern** - every component folder has `index.js`
6. **No scoped `<style>` blocks** - external `.css` files only, loaded at module scope
7. **No utility CSS frameworks** (Tailwind, UnoCSS, etc.)

## File Tree Convention

```
src/
├── index.html
├── main.js                          ← Entry point (createApp)
├── components/
│   ├── TodoList/
│   │   ├── index.js                 ← Barrel
│   │   ├── _TodoList.vue            ← SFC (PascalCase + _ prefix)
│   │   ├── _TodoList.css            ← External CSS
│   │   └── __tests__/
│   └── TodoItem/
│       ├── index.js
│       ├── _TodoItem.vue
│       ├── _TodoItem.css
│       └── __tests__/
└── composables/
    ├── index.js
    ├── _useTodos.js
    └── __tests__/
```

## Component Pattern (SFC with external CSS)

```vue
<!-- components/TodoItem/_TodoItem.vue -->
<script setup>
import { onMounted } from "vue";

const cssText = await (await fetch(new URL("./_TodoItem.css", import.meta.url))).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

onMounted(() => {
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
});

defineProps({
  todo: { type: Object, required: true },
  onToggle: { type: Function },
  onDelete: { type: Function },
});
</script>

<template>
  <article data-part="item" :data-state-completed="todo.completed ? 'done' : null">
    <input type="checkbox" data-part="toggle" :checked="todo.completed" @change="$emit('toggle', todo.id)" />
    <span data-part="title">{{ todo.title }}</span>
    <button data-part="delete" @click="$emit('delete', todo.id)">Delete</button>
  </article>
</template>
```

```css
/* components/TodoItem/_TodoItem.css */
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
```

## Vue ↔ store-and-signals mapping

| Store and signals           | Vue 3 Equivalent                  |
| --------------------------- | --------------------------------- |
| `StateSignal`               | `ref()` / `reactive()`            |
| `ComputedSignal`            | `computed()`                      |
| `effect()`                  | `watchEffect()` / `watch()`       |
| `Store (Proxy)`             | `reactive()` or Pinia store       |
| `tickState` bridge          | Deep reactivity (automatic)       |
| `html\`\`` tagged templates | `<template>` block                |
| `{{ expr \| filter }}`      | `{{ expr }}` + computed / methods |
| `${value}`                  | `{{ value }}`                     |
| `@click=${fn}`              | `@click="fn"`                     |
| `model={...}` directive     | `v-model`                         |
| `<for each="x in xs">`      | `v-for="x in xs" :key="x.id"`     |
| `<if condition="c">`        | `v-if="c"`                        |
| `<switch expr="x">`         | `v-if / v-else-if / v-else` chain |
| `adoptedStyleSheets`        | `onMounted` to adopt once         |
| `data-part="..."`           | `:data-part="..."` (Vue binding)  |

## CSS Loading - Module Scope

Always load CSS at module scope (outside `<script setup>`), not in `<style>` blocks.

```vue
<script setup>
// Module-scope: runs once per import
const cssText = await (await fetch(new URL("./_Component.css", import.meta.url))).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

onMounted(() => {
  // Adopt once per mount (idempotent via Set)
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
});
</script>

<template>...</template>
<!-- NO <style> block - use external .css file -->
```

## Lists and Conditionals

```vue
<template>
  <section data-part="list">
    <ul v-if="todos.length" data-part="items">
      <li v-for="todo in todos" :key="todo.id" data-part="item">
        {{ todo.title }}
      </li>
    </ul>
    <p v-else data-part="empty">No todos yet.</p>
  </section>
</template>
```

## State Management (Store -> reactive)

```js
// composables/_useAppStore.js
import { reactive } from "vue";

const state = reactive({
  todos: [],
  filter: "all",
});

export function useAppStore() {
  function addTodo(title) {
    state.todos.push({ id: crypto.randomUUID(), title, completed: false });
  }
  function toggleTodo(id) {
    const todo = state.todos.find((t) => t.id === id);
    if (todo) todo.completed = !todo.completed;
  }
  return { state, addTodo, toggleTodo };
}
```

## Barrel Pattern

```js
// components/TodoItem/index.js
export { default as TodoItem } from "./_TodoItem.vue";
```

---

## Guardrails

Run `rule_tool_frontend_vue` mode=check or `rule_tool_check` to validate code against these rules.

Key rules enforced: **no-css-classes**, **no-inline-styles**, **semantic-html**,
**external-css** (external .css files), **barrel-file**, **data-part**,
**vue-no-class-binding** (use `data-part` not `:class`),
**jsdoc-required** (every JS/TS file MUST have complete JSDoc - see rule-styleguide -> javascript.md),
**css-comments-required** (every CSS file MUST have file-level + section comments - see rule-styleguide -> css.md),
**a11y-test-required** (every project MUST have Playwright + @axe-core/playwright a11y tests in `tests/a11y/` - see rule-styleguide -> a11y.md -> Automated Testing).

## Project Scaffolding

All rule projects include standard config files. See [`rule-styleguide`](../rule-styleguide/SKILL.md) -> Project Scaffolding.
Use `rule_tool_styleguide mode=scaffold` or `rule_tool_scaffold` to generate: `.prettierrc`, `.nvmrc`, `.editorconfig`,
`.gitignore`, `.eslintrc.json`, `tsconfig.json`, `jsconfig.json`.

Iterate: `generate → rule_tool_check → fix → rule_tool_check → all pass`.

---

## Vue 3 Performance & Best Practices

This section extends rule-frontend-vue with a structured performance review methodology based on common Vue 3 reactivity, rendering, and architecture patterns.

### When to activate

- Review Vue component performance
- Refactor reactive state logic
- Explain unexpected re-renders or watcher loops
- Improve slow forms, lists, modals, dashboards, or large components
- Decide between `ref` / `reactive` / `shallowRef` / `computed` / `watch` / `watchEffect`
- Debug reactivity loss or stale computed values
- Write PR feedback about Vue code quality
- Split a large Vue component into smaller pieces

### Operating principles

1. **Reactivity is automatic - understand its boundaries.** Vue 3's Proxy-based reactivity tracks access, not assignment. Destructuring, spreading, or conditionally accessing reactive state can break tracking.

2. **Prefer structural fixes before micro-optimizations.** Check reactive dependencies, component boundaries, and watcher discipline before adding `v-once`, `v-memo`, or `shallowRef`.

3. **Classify each issue** as: correctness bug, performance risk, maintainability risk, API design risk, visual glitch, premature optimization.

4. **Keep the smallest safe change first.**

### Review workflow

1. Identify the symptom (slow typing, watcher loops, stale computed values, too many re-renders, flickering tooltips, lost form state, large component)
2. Find the owner (reactive dependency, watcher trigger, component boundary, provide/inject chain, computed chain depth)
3. Match to one of the 10 patterns below
4. Explain the risk
5. Propose smallest fix
6. End with a rule of thumb

### The 10 patterns

#### 1. Choose the right reactive container

`ref()` for primitives and simple values. `reactive()` for objects when you need deep reactivity. `shallowRef()` / `shallowReactive()` for large data that doesn't need deep tracking.

```ts
// ❌ reactive with primitive (breaks reactivity)
const count = reactive(0); // Never reactive - use ref

// ✅ ref for primitives
const count = ref(0);

// ✅ shallowRef for large immutable data
const largeList = shallowRef([]);
function updateList(data) {
  largeList.value = data; // trigger on whole-replacement
}
```

Rule: _Use `ref` for primitives, `reactive` for deep objects, `shallowRef` for large immutable data._

#### 2. Watch discipline - watch vs watchEffect

Use `watch` when you need the previous value or explicit dependencies. Use `watchEffect` for auto-tracking side effects. Never mutate state inside `watch` that triggers another watch (loop risk).

```ts
// ✅ watch: explicit deps, access to old value
watch(
  () => props.userId,
  async (newId, oldId) => {
    if (newId !== oldId) user.value = await fetchUser(newId);
  },
);

// ✅ watchEffect: auto-track dependencies
watchEffect(() => {
  localStorage.setItem("draft", JSON.stringify(draft.value));
});
```

Rule: _Use `watch` for explicit deps + old value, `watchEffect` for auto-tracked side effects. Never cause mutation loops._

#### 3. Computed values during render, not in watch

Do not use `watch` to derive state from other state.

```ts
// ❌ Derived in watch
const first = ref("");
const last = ref("");
const full = ref("");
watch([first, last], () => {
  full.value = `${first.value} ${last.value}`;
});

// ✅ Derived with computed
const first = ref("");
const last = ref("");
const full = computed(() => `${first.value} ${last.value}`);
```

Rule: _If you are calculating from existing reactive state, use `computed`. If you are syncing outside Vue, use `watchEffect`._

#### 4. Keep state low in the component tree

Move `ref()` / `reactive()` down to the component that actually needs it. Heavy siblings re-render when a parent's reactive state changes.

```vue
<script setup>
// ❌ State in App.vue - all children re-render on input
const search = ref("");
</script>

<!-- ✅ Extract into SearchSection.vue -->
<script setup>
const search = ref("");
</script>
```

Rule: _Keep reactive state as close as possible to where it is used. Lift via `provide/inject` only when truly shared._

#### 5. Always use `:key` with `v-for`

```vue
<!-- ❌ Index key - state, focus, animations break on reorder -->
<li v-for="(item, i) in items" :key="i">{{ item.title }}</li>

<!-- ✅ Stable ID key -->
<li v-for="item in items" :key="item.id">{{ item.title }}</li>
```

Acceptable exception: static lists that never reorder, insert, delete, or hold stateful children.

Rule: _If the list can change, never use index as key._

#### 6. Use `key` for intentional component reset

Changing `:key` unmounts and remounts a component - useful for forms, animations, and resetting internal state.

```vue
<UserForm :key="userId" :user-id="userId" />
```

Rule: _If you want to fully reset a component, change its key instead of manually reseting every internal value._

#### 7. Avoid prop drilling - use provide/inject or a store

Deep prop chains are brittle. Use `provide`/`inject` for shared concerns (theme, user, locale).

```ts
// ✅ Provider
provide("theme", { color: ref("dark"), setColor });

// ✅ Injector
const theme = inject("theme");
```

Rule: _Props for direct parents. Provide/inject for shared context across depth._

#### 8. One responsibility = one reason to change

Split components when data fetching, state transitions, formatting, and UI layout change for different reasons.

```vue
<!-- ❌ One component does everything -->
<!-- ✅ Extract composable + view component -->
<script setup>
const { data, isLoading, error } = useUserData(props.userId);
</script>
<template>
  <p v-if="isLoading">Loading...</p>
  <p v-else-if="error">Error</p>
  <h1 v-else>{{ data.name }}</h1>
</template>
```

Rule: _Split when different changes affect different parts._

#### 9. Use `Teleport` for modals, tooltips, and overlays

`<Teleport to="body">` prevents z-index and overflow issues for overlays.

```vue
<Teleport to="body">
  <div v-if="showModal" data-part="modal-overlay">
    <article data-part="modal">
      <slot />
    </article>
  </div>
</Teleport>
```

Rule: _Teleport overlays to `body` to avoid stacking context bugs._

#### 10. Template refs - access after mount, not during render

Use `onMounted` or `nextTick` to access template refs.

```vue
<script setup>
const el = ref(null);
onMounted(() => {
  el.value?.focus(); // ✅ safe after mount
});
</script>
<template>
  <input ref="el" data-part="search" />
</template>
```

Rule: _Template refs are `null` during render. Access them after mount._

### Decision matrix

| Symptom                                   | Check first               | Likely pattern                       | Fix                          |
| ----------------------------------------- | ------------------------- | ------------------------------------ | ---------------------------- |
| Reactive value not updating               | Reactive container choice | Wrong `ref` vs `reactive` type       | Use correct container        |
| Watcher runs infinitely                   | Mutation in watcher       | Loop via state mutation inside watch | Move logic or use `computed` |
| Stale computed value                      | Dependencies              | Missing reactive dep in computed     | Ensure all deps are accessed |
| Sibling re-renders on unrelated input     | State ownership           | State too high                       | Move state down              |
| v-for loses input/focus on reorder        | List keys                 | Index key bug                        | Use stable IDs               |
| Form keeps old values after entity change | Component identity        | Key reset needed                     | Change component key         |
| Deep prop chain is fragile                | API design                | Prop drilling                        | Provide/inject or store      |
| Large component is hard to maintain       | Reasons to change         | Mixed responsibilities               | Extract composable + view    |
| Modal/tooltip clipped by overflow         | Portal                    | Missing Teleport                     | Use `<Teleport to="body">`   |
| Ref is null when accessed                 | Timing                    | Template ref before mount            | Access in `onMounted`        |

### Supporting resources

| Resource               | Path                                         |
| ---------------------- | -------------------------------------------- |
| 10 detailed examples   | `examples/performance/01-*.md` ... `10-*.md` |
| PR review checklist    | `checklists/vue-performance-pr-checklist.md` |
| Decision matrix        | `checklists/decision-matrix.md`              |
| System prompt          | `prompts/portable-system-prompt.md`          |
| Code review prompt     | `prompts/code-review-prompt.md`              |
| Refactor prompt        | `prompts/refactor-prompt.md`                 |
| Teaching prompt        | `prompts/teaching-prompt.md`                 |
| Audit report template  | `templates/audit-report-template.md`         |
| PR comment template    | `templates/pr-comment-template.md`           |
| Refactor plan template | `templates/refactor-plan-template.md`        |
| Performance playbook   | `knowledge/vue-performance-playbook.md`      |

---

## Forms (Vue 3)

### Prerequisites

- Use `vee-validate` + `zod` for all forms
- Use `@vee-validate/zod` for schema integration
- Prefer Composition API (`useForm`) over Options API

### Step 1 - Define form with validation

```vue
<script setup lang="ts">
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";

const schema = toTypedSchema(
  z.object({
    email: z.string().email(),
    name: z.string().min(2).max(255),
  }),
);

const { defineField, handleSubmit, errors, isSubmitting } = useForm({
  validationSchema: schema,
  initialValues: { email: "", name: "" },
});

const [email, emailAttrs] = defineField("email");
const [name, nameAttrs] = defineField("name");

const onSubmit = handleSubmit(async (values) => {
  // send data
});
</script>

<template>
  <form data-part="form" @submit="onSubmit">
    <label data-part="field">
      <span data-part="label">Email</span>
      <input data-part="input" v-model="email" v-bind="emailAttrs" />
      <span data-part="error" v-if="errors.email">{{ errors.email }}</span>
    </label>
    <button data-part="submit" :disabled="isSubmitting">
      {{ isSubmitting ? "Saving..." : "Save" }}
    </button>
  </form>
</template>
```

### Checklist

- [ ] `vee-validate` + `@vee-validate/zod` + `zod` in use
- [ ] Schema validation covers full form
- [ ] Initial values are controlled
- [ ] Field-level errors rendered
- [ ] Submission guarded with `isSubmitting`

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-frontend](../rule-frontend/SKILL.md) - Frontend skill index
- [rule-styleguide](../rule-styleguide/SKILL.md) - Shared frontend standards
