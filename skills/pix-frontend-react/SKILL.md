---
name: rule-frontend-react
description: >-
  Use when building React 18+ functional components. Follows rule principles: zero CSS classes, semantic HTML, barrel file tree, data-part selectors.
tags:
  - "frontend"
  - "react"
frameworks: [react]
guardrails: [react-hooks-rules, react-no-classname]
---

# rule-frontend-react - React with rule Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) (file tree, naming, CSS, HTML)
and a store-and-signals architecture
to **React 18+ functional components with hooks**.

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** - only element selectors + `[data-part="..."]` + `[data-*]` attribute selectors
2. **Zero inline styles** - all styling in external `.css` files via `adoptedStyleSheets`
3. **Flex first** - `display: grid` only for named areas, subgrid, explicit placement, or auto-fit tracks; anything a flex row or column can do is flex.
4. **Semantic HTML is mandatory** - never `<div>` where `<section>`, `<article>`, `<header>`, `<footer>`, `<nav>`, `<main>`, `<aside>`, `<form>`, `<ul>`, `<ol>`, `<li>`, `<search>` exists
5. **Barrel pattern** - every component folder has `index.js` re-export, files are `_PascalCase.ext`
6. **No CSS-in-JS, no CSS Modules, no Tailwind** - external `.css` files only

## File Tree Convention

```
src/
├── index.html
├── index.jsx                        ← Entry point
├── components/
│   ├── TodoList/
│   │   ├── index.js                 ← Barrel
│   │   ├── _TodoList.jsx            ← Component (PascalCase + _ prefix)
│   │   ├── _TodoList.css            ← External CSS (co-located)
│   │   ├── _TodoList.consts.js      ← Constants (optional)
│   │   └── __tests__/
│   │       └── _TodoList.test.jsx
│   └── TodoItem/
│       ├── index.js
│       ├── _TodoItem.jsx
│       ├── _TodoItem.css
│       └── __tests__/
└── helpers/
    ├── index.js
    ├── _formatDate.js
    └── __tests__/
```

- Component folders: `PascalCase/`
- Non-component folders: `kebab-case/`
- Non-index files: `_PascalCase.ext` (components), `_kebab-case.ext` (utilities)
- Barrel: `index.js` in every folder

## Component Pattern

```jsx
// components/TodoItem/_TodoItem.jsx
import { useEffect, useRef } from "react";

const cssText = await (await fetch(new URL("./_TodoItem.css", import.meta.url))).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export function TodoItem({ todo, onToggle, onDelete }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && !ref.current.__styled) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      ref.current.__styled = true;
    }
  }, []);

  return (
    <article ref={ref} data-part="item" data-state-completed={todo.completed ? "done" : null}>
      <input type="checkbox" data-part="toggle" checked={todo.completed} onChange={() => onToggle(todo.id)} />
      <span data-part="title">{todo.title}</span>
      <button data-part="delete" onClick={() => onDelete(todo.id)}>
        Delete
      </button>
    </article>
  );
}
```

```css
/* components/TodoItem/_TodoItem.css - NO classes */
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
[data-part="toggle"] {
  accent-color: var(--color-accent);
}
button[data-part="delete"] {
  background: var(--color-danger);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}
```

### Barrel

```js
// components/TodoItem/index.js
export { TodoItem } from "./_TodoItem.jsx";
```

## React ↔ store-and-signals mapping

| Store and signals           | React Equivalent                          |
| --------------------------- | ----------------------------------------- |
| `StateSignal`               | `useState` / `useReducer`                 |
| `ComputedSignal`            | `useMemo`                                 |
| `effect()`                  | `useEffect`                               |
| `Store (Proxy)`             | React Context + `useReducer`              |
| `tickState` bridge          | Context dispatch                          |
| `html\`\`` tagged templates | JSX                                       |
| `{{ expr \| filter }}`      | `{expression}` inline                     |
| `${value}`                  | `{value}`                                 |
| `@click=${fn}`              | `onClick={fn}`                            |
| `model={...}` directive     | `value` + `onChange`                      |
| `<for each="x in xs">`      | `{xs.map(x => <Component key={x.id} />)}` |
| `<if condition="c">`        | `{c && <Content />}` or ternary           |
| `<switch expr="x">`         | `{switch(x) { ... }}` or object map       |
| `adoptedStyleSheets`        | `useEffect` to adopt once                 |
| `data-part="..."`           | `data-part="..."` (same)                  |
| `static {}` block           | Module-level CSS fetch                    |

## CSS Loading Pattern

Always load CSS as an external file, convert to `CSSStyleSheet`, adopt once.

```jsx
// Module-level: fetch + create sheet (runs once per import)
const cssText = await (await fetch(new URL("./_Component.css", import.meta.url))).text();
const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

// In component: adopt on mount (once per element)
useEffect(() => {
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}, []);
```

## State Management (Store -> Context)

```jsx
// helpers/_AppContext.jsx
import { createContext, useContext, useReducer } from "react";

const AppContext = createContext(null);
const AppDispatch = createContext(null);

export function AppProvider({ children, initialState, reducer }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={state}>
      <AppDispatch.Provider value={dispatch}>{children}</AppDispatch.Provider>
    </AppContext.Provider>
  );
}

export function useAppState() {
  return useContext(AppContext);
}

export function useAppDispatch() {
  return useContext(AppDispatch);
}
```

## Rendering Lists

```jsx
// ❌ NO: className, <div> for items
<ul data-part="list">
  {todos.map((todo) => (
    <li key={todo.id} data-part="item">
      <TodoItem todo={todo} />
    </li>
  ))}
</ul>
```

## Conditional Rendering

```jsx
// ✅ Use: ternary, &&, or early return
{
  hasTodos ? (
    <ul data-part="list">
      {todos.map((t) => (
        <li key={t.id} data-part="item">
          {t.title}
        </li>
      ))}
    </ul>
  ) : (
    <p data-part="empty">No todos yet.</p>
  );
}
```

## Complete Example: TodoApp

See the full working example in `examples/react/` of the rule-frontend-react skill directory,
or adapt the vanilla Hello World to JSX syntax.

---

## Guardrails

Run `rule_tool_frontend_react` mode=check or `rule_tool_check` to validate code against these rules.

Key rules enforced: **no-css-classes**, **no-inline-styles**, **semantic-html**,
**external-css** (CSS Modules or adoptedStyleSheets), **barrel-file**, **data-part**,
**react-no-classname** (no `className`, use `data-part`), **react-hooks-rules**
(hooks at top level),
**jsdoc-required** (every JS/TS file MUST have complete JSDoc - see rule-styleguide -> javascript.md),
**css-comments-required** (every CSS file MUST have file-level + section comments - see rule-styleguide -> css.md),
**a11y-test-required** (every project MUST have Playwright + @axe-core/playwright a11y tests in `tests/a11y/` - see rule-styleguide -> a11y.md -> Automated Testing).

## Project Scaffolding

All rule projects include standard config files. See [`rule-styleguide`](../rule-styleguide/SKILL.md) -> Project Scaffolding.
Use `rule_tool_styleguide mode=scaffold` to generate: `.prettierrc`, `.nvmrc`, `.editorconfig`,
`.gitignore`, `.eslintrc.json`, `tsconfig.json`, `jsconfig.json`.

Iterate: `generate → rule_tool_check → fix → rule_tool_check → all pass`.

---

## React Performance

This section extends rule-frontend-react with a structured performance review and refactoring methodology based on 10 common React performance and architecture mistakes.

### When to activate

Activate this performance lens when the user asks for any of:

- Review React performance
- Refactor React state logic
- Explain unexpected re-renders
- Improve slow input, filtering, search, forms, lists, tooltips, accordions, modals, dashboards, or large components
- Decide between `useState`, `useReducer`, `useEffect`, `useLayoutEffect`, `useMemo`, `React.memo`, `useTransition`, debounce, or composition
- Write PR feedback about React code quality
- Turn a large React component into smaller pieces
- Create a React performance checklist or training material

### Operating principles

1. **Prefer structural fixes before micro-optimizations.** Do not reach for `React.memo`, `useMemo`, `useCallback`, or `useTransition` as a reflex. First inspect state ownership, render boundaries, derived state, effects, keys, and component responsibilities.

2. **Classify each issue** as one of: correctness bug, performance risk, maintainability risk, API design risk, visual rendering glitch, premature optimization.

3. **Keep the smallest safe change first.** Then optionally suggest a more complete refactor.

4. **Preserve public behavior** unless the user asks for API changes.

5. **Prefer TypeScript examples** when the project already uses TypeScript.

6. **Do not introduce dependencies** unless the user already uses them or explicitly allows them.

### Review workflow

1. Identify the symptom (slow typing, UI freeze, too many network requests, stale data, flicker, lost input state, hard to customize, confusing effects, large component)
2. Find the owner of the problem (state ownership, render boundary, effect dependency, network boundary, DOM measurement timing, component API surface)
3. Match the issue to one of the 10 patterns below
4. Explain the risk in plain language
5. Propose the smallest practical fix
6. Add a before/after example when useful
7. End with a rule of thumb

Review order: correctness risks -> state consistency -> state ownership and render boundaries -> effects and derived values -> keys and component identity -> network frequency vs UI rendering -> memoization discipline -> DOM measurement timing -> component responsibility boundaries -> component API design.

### The 10 patterns

#### 1. Dependent state belongs in a reducer

Use `useReducer` when multiple state values must stay in sync.

```tsx
// ❌ Separate setters - invalid states possible
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [user, setUser] = useState(null);

// ✅ Discriminated union - invalid states impossible
type UserState = { status: "loading"; user: null; error: null } | { status: "success"; user: User; error: null } | { status: "error"; user: null; error: string };

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case "success":
      return { status: "success", user: action.payload, error: null };
    case "error":
      return { status: "error", user: null, error: action.payload };
    default:
      return state;
  }
}
```

Rule: _If state values depend on each other or must always stay consistent, prefer a reducer or an explicit state machine shape._

#### 2. `useTransition` and debounce solve different problems

`useTransition` improves **render responsiveness** (expensive UI work). Debounce reduces **frequency** (network calls, analytics, autosave).

```txt
UI freezing while rendering big local list → useTransition
API called on every keystroke → debounce
Both happening → debounce request + transition for rendering results
```

Rule: _`useTransition` improves render responsiveness. Debounce reduces frequency._

#### 3. Keep state where it is actually needed

Move state down when only a small part of the tree needs it. Before adding `React.memo`, ask: can the state move down? Can the heavy child move out of the state owner?

```tsx
function SearchSection() {
  const [search, setSearch] = useState(""); // Owned here, not in parent
  return (
    <>
      <SearchBox value={search} onChange={setSearch} />
      <Results query={search} />
    </>
  );
}
```

Rule: _Keep state as close as possible to where it is used. Lift only when sharing is real._

#### 4. `useEffect` is for synchronization, not derived calculations

Use `useEffect` when React must sync with something **outside** React (localStorage, subscriptions, timers, browser events, imperative APIs, fetch).

```tsx
// ❌ Derived state in effect
const [double, setDouble] = useState(0);
useEffect(() => {
  setDouble(count * 2);
}, [count]);

// ✅ Calculate during render
const double = count * 2;
```

Rule: _If you are calculating from existing React state, calculate during render. If you are syncing outside React, use an effect._

#### 5. Do not use array index as `key` for changing lists

```tsx
// ❌ Index key - state, focus, animations break on reorder
{
  tasks.map((task, i) => <TaskItem key={i} task={task} />);
}

// ✅ Stable ID
{
  tasks.map((task) => <TaskItem key={task.id} task={task} />);
}
```

Acceptable exception: static lists that never reorder, insert, delete, filter, or hold stateful children.

Rule: _If the list can change, never use index as key._

#### 6. Changing `key` resets a component

Use a changing key when the desired behavior is a full fresh start (form reset, animation restart, discarding old local state).

```tsx
<UserForm key={userId} userId={userId} /> // Fully resets on userId change
```

Rule: _If you want to fully reset a component, change its key instead of manually syncing every internal value._

#### 7. Not everything needs `useMemo`

```tsx
// ❌ Trivial calculation
const fullName = useMemo(() => `${user.firstName} ${user.lastName}`, [user]);

// ✅ Only for expensive work or meaningful referential stability
const sortedItems = useMemo(() => [...items].sort((a, b) => a.price - b.price), [items]);
```

Never mutate props or state inside `useMemo`. Copy before sorting/reversing.

Rule: _Memoize expensive work, not simple values._

#### 8. One responsibility means one reason to change

Split when data fetching, state transitions, UI rendering, and formatting change for different reasons.

```tsx
function useUserData(userId: string) {
  return useQuery({ queryKey: ["user", userId], queryFn: () => fetchUser(userId) });
}

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useUserData(userId);
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error loading user</p>;
  return <h1>{data.name}</h1>;
}
```

Rule: _Split when different changes affect different parts._

#### 9. Use `useLayoutEffect` only to prevent visible layout glitches

`useLayoutEffect` runs after DOM mutations but **before** paint. Use for tooltip/popover positioning, measuring before animation, avoiding one-frame visual jumps.

```tsx
// ✅ Prevents visible flicker
useLayoutEffect(() => {
  const rect = ref.current.getBoundingClientRect();
  // adjust position before paint
}, [visible]);
```

Warning: `useLayoutEffect` blocks paint. Overuse reduces performance.

Rule: _Use `useLayoutEffect` only when the user would otherwise see a visual glitch._

#### 10. Avoid prop soup with compound components

When a component gains too many customization props, prefer composition and compound components.

```tsx
// ❌ Prop soup
<Accordion renderHeader={...} renderBody={...} showIcon={true} iconPosition="left" />

// ✅ Compound composition
<Accordion>
  <Accordion.Item>
    <Accordion.Header>Billing</Accordion.Header>
    <Accordion.Body>Billing details...</Accordion.Body>
  </Accordion.Item>
</Accordion>
```

Rule: _If your component API keeps growing flags and render props, split the API into composable parts._

### Decision matrix

| Symptom                             | Check first                  | Likely pattern         | Fix                          |
| ----------------------------------- | ---------------------------- | ---------------------- | ---------------------------- |
| Slow typing                         | State owner + heavy siblings | State too high         | Move state down              |
| Search sends too many requests      | Network call frequency       | Debounce needed        | Debounce input or request    |
| Big local filtering freezes UI      | Render workload              | `useTransition` needed | Wrap non-urgent update       |
| Error and data appear together      | Dependent state              | Reducer needed         | Use reducer or state machine |
| Effect loops or double renders      | Derived state in effect      | Misused `useEffect`    | Calculate during render      |
| Input value moves to another row    | List keys                    | Index key bug          | Use stable IDs               |
| Form keeps old values               | Component identity           | Key reset needed       | Change component key         |
| Many `useMemo` around simple values | Calculation cost             | Overmemoization        | Remove memoization           |
| Tooltip flickers                    | DOM measurement timing       | Effect after paint     | Use `useLayoutEffect`        |
| Component has 20+ props             | API design                   | Prop soup              | Use composition              |

### PR review style

Structure each comment as:

```md
Observation: [what the code currently does]
Risk: [why this causes a bug, performance issue, visual glitch, or maintenance problem]
Suggested fix: [smallest practical change]
Example: [code snippet]
Rule of thumb: [one reusable sentence]
```

### Final response template

```md
## React performance review

### Main finding

Short summary of the highest-impact issue.

### Issues found

#### 1. Title

- Pattern: one of the 10
- Risk: what can go wrong
- Fix: smallest safe change

### Suggested priority

1. Fix correctness risks first
2. Fix render boundary problems second
3. Remove premature optimizations third

### Rule of thumb

One reusable principle.
```

### Refusal and uncertainty handling

If code is missing, do not invent project-specific details. Provide a checklist and ask for the smallest useful snippet (component, parent owner, list rendering, or effect block).

If performance claims are uncertain, say so and suggest measurement with React DevTools Profiler, browser Performance panel, or targeted render logging.

### Supporting resources

All materials from the companion performance skill are integrated into the rule-frontend-react skill directory:

| Resource               | Path                                           |
| ---------------------- | ---------------------------------------------- |
| 10 detailed examples   | `examples/performance/01-*.md` ... `10-*.md`   |
| PR review checklist    | `checklists/react-performance-pr-checklist.md` |
| Decision matrix        | `checklists/decision-matrix.md`                |
| System prompt          | `prompts/portable-system-prompt.md`            |
| Code review prompt     | `prompts/code-review-prompt.md`                |
| Refactor prompt        | `prompts/refactor-prompt.md`                   |
| Teaching prompt        | `prompts/teaching-prompt.md`                   |
| Audit report template  | `templates/audit-report-template.md`           |
| PR comment template    | `templates/pr-comment-template.md`             |
| Refactor plan template | `templates/refactor-plan-template.md`          |
| Performance playbook   | `knowledge/react-performance-playbook.md`      |

---

# Scaffolding: React Project Setup

## Required libraries

- `react`, `react-dom`
- `react-router-dom` or `@tanstack/react-router`
- `zod` for validation
- `typescript`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`

## Mandatory folder structure for React projects

```
src/
├── main.tsx                    # App entry point
├── App.tsx                     # Root component
├── routes/
│   └── index.tsx               # Route definitions
├── pages/
│   ├── Home.tsx
│   └── NotFound.tsx
├── components/
│   └── Layout.tsx              # Shared layout wrapper
├── hooks/
│   └── useHealth.ts            # Custom hooks
├── services/
│   └── api.ts                  # Typed API layer
├── types/
│   └── api.ts                  # API contracts
└── utils/
    └── env.ts                  # Environment helpers
```

## Step-by-step

### Step 1 - App bootstrap

- `src/main.tsx` mounts app with `BrowserRouter`
- `src/routes/index.tsx` defines base route table
- Include at least `Home` and `NotFound` pages

### Step 2 - Typed API layer

- `src/services/api.ts` exposes typed API helpers
- `src/types/api.ts` defines API contracts
- Validate critical payloads with `zod`

### Step 3 - UI composition

- `src/components/Layout.tsx` wraps page-level layout
- `src/pages/Home.tsx` demonstrates service usage
- `src/pages/NotFound.tsx` handles unknown routes

## Quality gates

- TypeScript strict mode enabled
- Error boundary at root level
- Separation: routes/pages/components/services/types
- Never empty files or TODO placeholders

## Forms (React Hook Form)

### Prerequisites

- Use `react-hook-form` for all forms
- Use `zod` with `@hookform/resolvers` for validation
- Avoid form-level ad-hoc validation in individual inputs

### Step 1 - Define controlled defaults

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(255),
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", name: "" },
  });

  const onSubmit = async (data: FormData) => {
    // send data
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} data-part="form">
      <label data-part="field">
        <span data-part="label">Email</span>
        <input data-part="input" type="email" {...register("email")} />
        {errors.email && <span data-part="error">{errors.email.message}</span>}
      </label>
      <button data-part="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

### Step 2 - Scale complex forms

- Split large forms into subcomponents bound via `FormProvider` + `useFormContext`
- Use `useFieldArray` for dynamic collections
- Disable submit while `isSubmitting` to prevent double submission
- Show field-level errors consistently

```tsx
import { useForm, useFieldArray, FormProvider } from "react-hook-form";

function OrderForm() {
  const form = useForm({ defaultValues: { items: [{ product: "", qty: 1 }] } });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {fields.map((field, index) => (
          <ItemRow key={field.id} index={index} onRemove={() => remove(index)} />
        ))}
        <button type="button" onClick={() => append({ product: "", qty: 1 })}>
          Add Item
        </button>
        <button type="submit" disabled={form.formState.isSubmitting}>
          Submit
        </button>
      </form>
    </FormProvider>
  );
}
```

### Checklist

- [ ] `react-hook-form` + `@hookform/resolvers` + `zod` in use
- [ ] Schema validation covers full form
- [ ] Default values are controlled (no null/undefined)
- [ ] Field-level errors rendered
- [ ] Submission guarded with `isSubmitting`
- [ ] Large forms split via `FormProvider`

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-frontend](../rule-frontend/SKILL.md) - Frontend skill index
- [rule-styleguide](../rule-styleguide/SKILL.md) - Shared frontend standards
- [rule-data-validation](../rule-data-validation/SKILL.md) - Business validation rules
- [rule-toolchain-vite](../rule-toolchain-vite/SKILL.md) - Vite configuration
