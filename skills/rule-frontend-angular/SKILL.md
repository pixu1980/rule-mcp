---
name: rule-frontend-angular
description: >-
  Use when building Angular standalone components. Follows rule-mcp principles: zero CSS classes, semantic HTML, barrel file tree, data-part selectors.
tags:
  - "frontend"
  - "angular"
frameworks: [angular]
guardrails: [angular-no-ngclass]
---

# rule-frontend-angular - Angular with rule-mcp Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) and
a store-and-signals architecture to **Angular standalone components**.

## Step 0 - Pin the Angular version and load the official guidance

Several rules below depend on the Angular major version. Before writing or
reviewing code:

1. Read the version: `frameworkVersion` from the Angular CLI MCP `list_projects`
   tool, or `@angular/core` in `package.json`.
2. With the Angular CLI MCP server available, call `get_best_practices` with the
   workspace path to load the version-matched official guide, and
   `search_documentation` (with the major version) for any API you are unsure of.
   Never guess an API from memory.
3. Apply the version notes in this skill (`v17+`, `v19+`, `v22+`). The examples
   target v20+; on older versions fall back to the noted legacy form.
4. Where the official guide and this skill disagree, this skill wins only on the
   rule-mcp conventions it states explicitly as deviations (see Core Rules).

## Core Rules (inherited from rule-mcp skills)

1. **Zero CSS classes** - only element selectors + `[data-part="..."]` + `[data-*]`.
   Deliberate deviation: the angular.dev guide suggests `[class]` bindings instead
   of `ngClass`; rule-mcp forbids both and moves state into `[attr.data-*]`.
2. **Zero inline styles** - external `.css` files only (`styleUrl` / `@Component.styles`)
3. **Flex first** - `display: grid` only for named areas, subgrid, explicit placement, or auto-fit tracks; anything a flex row or column can do is flex.
4. **Semantic HTML is mandatory** - never `<div>` where a semantic element exists
5. **Barrel pattern** - every component folder has `index.ts`
6. **No Angular Material CDK Overlay inline styles** - use CSS `[data-part]` instead
7. **Standalone components** - no NgModules. Omit `standalone: true`: it is the
   default since v19 (write it explicitly only on v14-v18)

## File Tree Convention

```
src/
├── index.html
├── main.ts                          ← bootstrapApplication
├── components/
│   ├── TodoList/
│   │   ├── index.ts                 ← Barrel
│   │   ├── _TodoList.component.ts   ← Component (PascalCase + _ prefix)
│   │   ├── _TodoList.component.css  ← External CSS
│   │   ├── _TodoList.consts.ts      ← Constants
│   │   └── __tests__/
│   │       └── _TodoList.component.spec.ts
│   └── TodoItem/
│       ├── index.ts
│       ├── _TodoItem.component.ts
│       ├── _TodoItem.component.css
│       └── __tests__/
└── services/
    ├── index.ts
    ├── _todo.service.ts
    └── __tests__/
```

## Component Pattern

```typescript
// components/TodoItem/_TodoItem.component.ts
import { Component, input, output } from "@angular/core";

import type { Todo } from "../../services";

/** One todo row: toggles completion and asks its parent to delete it. */
@Component({
  selector: "todo-item",
  styleUrl: "./_TodoItem.component.css",
  template: `
    <article data-part="item" [attr.data-state-completed]="todo().completed ? 'done' : null">
      <label data-part="title">
        <input type="checkbox" data-part="toggle" [checked]="todo().completed" (change)="toggle.emit(todo().id)" />
        {{ todo().title }}
      </label>
      <button type="button" data-part="delete" [attr.aria-label]="'Delete ' + todo().title" (click)="delete.emit(todo().id)">Delete</button>
    </article>
  `,
})
export class TodoItem {
  readonly todo = input.required<Todo>();
  readonly toggle = output<string>();
  readonly delete = output<string>();
}
```

```css
/**
 * FILE: components/TodoItem/_TodoItem.component.css
 * USAGE: Styles for TodoItem
 * SCOPE: todo-item
 */
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

## Angular ↔ store-and-signals mapping

| Store and signals           | Angular Equivalent                            |
| --------------------------- | --------------------------------------------- |
| `StateSignal`               | `signal()`                                    |
| `ComputedSignal`            | `computed()` / `linkedSignal()` (writable)    |
| `effect()`                  | `effect()` (side effects only)                |
| `Store (Proxy)`             | Service + `signal()`                          |
| `html\`\`` tagged templates | Component `template`                          |
| `{{ expr }}`                | `{{ expr }}`                                  |
| `@click=${fn}`              | `(click)="fn()"`                              |
| `model={...}` directive     | `model()` with `[(prop)]`                     |
| `<for each="x in xs">`      | `@for (x of xs; track x.id)`                  |
| `<if condition="c">`        | `@if (c)`                                     |
| `adoptedStyleSheets`        | `styleUrl` in @Component decorator            |
| `data-part="..."`           | `data-part="..."` or `[attr.data-part]="..."` |

## CSS Loading - Angular Style

Use Angular's native `styleUrl` (v17+; `styleUrls: [...]` before) in the
`@Component` decorator, with a path relative to the component file.
No fetch/adoptedStyleSheets needed - Angular handles scoped CSS loading.

```typescript
/** Minimal component whose styles load from an external sheet. */
@Component({
  selector: "my-component",
  styleUrl: "./_MyComponent.component.css",
  template: `...`,
})
export class MyComponent {}
```

## Lists and Conditionals (Angular 17+ @ syntax)

Use the built-in control flow; `*ngIf` / `*ngFor` / `*ngSwitch` are legacy.

```typescript
/** Todo list with an empty state, built on the @if / @for control flow. */
@Component({
  selector: "todo-list",
  template: `
    <section data-part="list">
      @if (todos().length > 0) {
        <ul data-part="items">
          @for (todo of todos(); track todo.id) {
            <li data-part="item">{{ todo.title }}</li>
          }
        </ul>
      } @else {
        <p data-part="empty">No todos yet.</p>
      }
    </section>
  `,
})
export class TodoList {
  readonly todos = input<Todo[]>([]);
}
```

## Modern Angular APIs (v17+ unless noted)

- **Inputs, outputs, two-way binding**: `input()` / `input.required()`, `output()`,
  `model()`. Not `@Input` / `@Output` / `EventEmitter`.
- **Dependency injection**: `inject()`, not constructor parameters.
- **Host bindings**: the `host: {}` object of `@Component` / `@Directive`, not
  `@HostBinding` / `@HostListener`.
- **Template imports**: import only the directives and pipes the template uses
  (`AsyncPipe`, `DatePipe`, ...). Never `CommonModule`.
- **Derived state**: `computed()`; `linkedSignal()` (v19+) when derived state must
  also be writable. Never `mutate()` on a signal: use `set()` / `update()`.
- **Async data**: `resource()` / `httpResource()` (v19+/v20+) for signal-based
  loading; RxJS only for real stream composition.
- **Images**: `NgOptimizedImage` (`ngSrc`) for static images; it does not apply to
  inline base64.
- **Services**: `providedIn: "root"` for singletons (`@Service` on v22+).

## Barrel Pattern

```typescript
// components/TodoItem/index.ts
export { TodoItem } from "./_TodoItem.component";
```

---

## Guardrails (Testable Assertions)

- [ ] **guardrail-no-css-classes**: CSS uses element + [data-part="..."] + [data-*] selectors only. Zero .class selectors.
- [ ] **guardrail-no-inline-styles**: Templates have zero style="..." attributes. External CSS via `styleUrl` in @Component.
- [ ] **guardrail-semantic-html**: No <div> where <header>/<section>/<article>/<footer>/<nav>/<main>/<aside>/<form>/<ul>/<ol>/<li> exists.
- [ ] **guardrail-external-css**: CSS loaded as external file via Angular `styleUrl`. No fetch/adoptedStyleSheets needed.
- [ ] **guardrail-barrel-file**: Component folder has index.ts barrel. Files: _PascalCase.ext.
- [ ] **guardrail-data-part**: Child elements use data-part="role" instead of class names.
- [ ] **guardrail-no-framework-css**: No CSS-in-JS, no CSS Modules, no Tailwind. Pure external CSS only.
- [ ] **guardrail-angular-specific**: Follows Angular rule-frontend-angular conventions. Use `styleUrl`, standalone components without NgModules, signals for state management.
- [ ] **guardrail-jsdoc-required**: Every JS/TS file MUST have complete JSDoc on all exported symbols (see rule-styleguide -> comments.md).
- [ ] **guardrail-css-comments-required**: Every CSS file MUST have file-level + section comments (see rule-styleguide -> css.md).
- [ ] **guardrail-a11y-test-required**: Every project MUST have Playwright + @axe-core/playwright a11y tests in `tests/a11y/` (see rule-styleguide -> a11y.md -> Automated Testing).

## Project Scaffolding

All rule-mcp projects include standard config files. See [`rule-styleguide`](../rule-styleguide/SKILL.md) -> Project Scaffolding.
Use `rule_tool_styleguide mode=scaffold` to generate: `.prettierrc`, `.nvmrc`, `.editorconfig`,
`.gitignore`, `.eslintrc.json`, `tsconfig.json`, `jsconfig.json`.

---

## Angular Performance & Best Practices

This section extends rule-frontend-angular with a structured performance review methodology based on common Angular change detection, signal, and architecture patterns.

### When to activate

- Review Angular component performance
- Refactor component state and change detection strategy
- Explain unexpected re-renders or unnecessary change detection cycles
- Improve slow forms, lists, modals, dashboards, or large components
- Decide between Signals, async pipe, `OnPush`, or classic `ChangeDetectionStrategy.Default`
- Write PR feedback about Angular code quality
- Split a large Angular component into smaller pieces

### Operating principles

1. **Change detection is the key lever.** With Zone.js and the `Default` strategy, every async event checks every component. `OnPush` checks only when inputs change, template events fire, async pipes emit, or a signal read in the template changes. Zoneless apps drop Zone.js and schedule checks only from those notifications.

2. **Signals (Angular 16+) are the future.** Prefer `signal()` / `computed()` / `effect()` over `BehaviorSubject` + `async` pipe for component state.

3. **Classify each issue** as: correctness bug, performance risk, maintainability risk, API design risk, visual glitch, premature optimization.

4. **Keep the smallest safe change first.**

### Review workflow

1. Identify the symptom (slow typing, too many change detection cycles, flickering overlays, large component, memory leaks)
2. Find the owner (change detection trigger, signal dependency, subscription lifecycle, component tree depth)
3. Match to one of the 10 patterns below
4. Explain the risk
5. Propose smallest fix
6. End with a rule of thumb

### The 10 patterns

#### 1. `OnPush` everywhere, zoneless where possible

`OnPush` reduces unnecessary checks. Components update only when inputs change,
template events fire, async pipes emit, or a template signal changes.

- **v22+**: `OnPush` is the default. Do not set `changeDetection` explicitly.
- **up to v21**: set it on every component.

```typescript
// up to v21
/** Component that opts in to OnPush explicitly (v21 and earlier). */
@Component({
  selector: "my-component",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
export class MyComponent {}
```

**Zoneless.** Zoneless is the default from v21: check that no
`provideZoneChangeDetection()` overrides it. On v20 opt in with
`provideZonelessChangeDetection()` at bootstrap
(`provideExperimentalZonelessChangeDetection()` on v18-v19). Then remove `zone.js`
and `zone.js/testing` from the build and test polyfills. Zoneless requires
components that notify Angular through signals, inputs, template events, the
`async` pipe or `markForCheck()` - the same contract as `OnPush`. With the Angular
CLI MCP server available, its `onpush_zoneless_migration` tool plans the
migration file by file.

Rule: _`OnPush` on every component (implicit on v22+). Use `Default` only with a stated reason. Stay zoneless._

#### 2. Prefer Signals over `BehaviorSubject` + `async` pipe

`signal()` is simpler, zone-independent, and enables zoneless change detection.

```typescript
// ❌ RxJS for component state
private dataSubject = new BehaviorSubject<Data | null>(null);
data$ = this.dataSubject.asObservable();

// ✅ Signal - simpler, zoneless-ready
private dataSignal = signal<Data | null>(null);
readonly data = this.dataSignal.asReadonly();
```

Rule: _Use `signal()` for local state, RxJS for complex async streams (debounce, combineLatest, etc.)._

#### 3. Track a stable identity in `@for`

`track` is mandatory in `@for`: a block without it does not compile. The risk is
the expression you pass. `track $index` matches items by position, so a list that
reorders, filters, inserts or deletes rebuilds the wrong DOM nodes - the same bug
as React's `key={index}`.

```html
<!-- ✅ Stable identity -->
@for (item of items; track item.id) {
<li data-part="item">{{ item.title }}</li>
}

<!-- ❌ Position-based identity on a mutable list -->
@for (item of items; track $index) {
<li data-part="item">{{ item.title }}</li>
}
```

Rule: _Always provide a stable identity `track` in `@for`. Never use index for mutable lists._

#### 4. Compute values synchronously, not in lifecycle hooks

Derive displayed values during render, not in `ngOnChanges` or `ngDoCheck`.

```typescript
// ❌ Computed in lifecycle
private _items = signal<Item[]>([]);
readonly sortedItems = signal<Item[]>([]);

constructor() {
  effect(() => {
    this.sortedItems.set([...this._items()].sort((a, b) => a.price - b.price));
  });
}

// ✅ Computed with computed()
readonly sortedItems = computed(() =>
  [...this._items()].sort((a, b) => a.price - b.price)
);
```

Rule: _Use `computed()` for derived values, not `effect()` or lifecycle hooks._

#### 5. Unsubscribe in `ngOnDestroy` or use `takeUntilDestroyed`

Every subscription, interval, and event listener MUST be cleaned up.

```typescript
// ❌ Memory leak - no unsubscribe
this.route.params.subscribe((params) => {
  this.loadData(params.id);
});

// ✅ takeUntilDestroyed (Angular 16+) - no argument inside an injection context
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

constructor() {
  this.route.params.pipe(takeUntilDestroyed()).subscribe((params) => {
    this.loadData(params.id);
  });
}

// ✅ Outside an injection context (ngOnInit, methods) pass a DestroyRef,
// or it throws NG0203
private destroyRef = inject(DestroyRef);

ngOnInit() {
  this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
    this.loadData(params.id);
  });
}
```

Rule: _Every subscription must be cleaned up. Prefer `takeUntilDestroyed` over manual `ngOnDestroy` Subject._

#### 6. Keep state in the component, not in global singletons

Service state persists across routes. Component-scoped state via `signal()` should be the default.

```typescript
// ✅ Local state - scoped to component
/** Search box whose term lives and dies with the component. */
@Component({ ... })
export class SearchComponent {
  private searchTerm = signal("");
}
```

Share state via services only when multiple unrelated components need the same data.

Rule: _Local state in `signal()`, shared state in service with `signal()`, async streams in RxJS._

#### 7. Lazy-load feature routes

Every route should be lazy-loaded. Never import everything in the root module.

```typescript
// routes.ts - lazy by default
/** Application routes; every entry loads its code on first navigation. */
export const routes: Routes = [
  {
    path: "admin",
    // A named export needs .then(); a bare import() expects a default export
    loadComponent: () => import("./admin/_AdminPanel.component").then((m) => m.AdminPanel),
  },
];
```

Rule: _Every route is lazy. `loadComponent` / `loadChildren` by default._

#### 8. One responsibility = one reason to change

Split when data fetching, state transitions, formatting, and UI layout change for different reasons.

```typescript
// ✅ Service handles data
/** Owns the current user and its loading and error state. */
@Injectable({ providedIn: "root" })
export class UserService {
  readonly user = signal<User | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Fetch one user and publish it through the signals above.
   *
   * @param id - the user id
   */
  loadUser(id: string) {
    // fetch, then set user / isLoading / error
  }
}

// ✅ Component handles display only
/** Renders the user that UserService owns; holds no state of its own. */
@Component({ ... })
export class UserProfile {
  private userService = inject(UserService);
  readonly user = this.userService.user.asReadonly();
  readonly isLoading = this.userService.isLoading.asReadonly();
  readonly error = this.userService.error.asReadonly();
}
```

Rule: _Split when different changes affect different parts._

#### 9. Use `@defer` for below-the-fold content (Angular 17+)

`@defer` lazy-loads component code and renders it when conditions are met.

```html
@defer (on viewport) {
<heavy-chart />
} @placeholder {
<p data-part="placeholder">Chart loading...</p>
} @loading {
<p data-part="loading">Loading chart...</p>
}
```

Rule: _Defer heavy, non-critical components until they are visible or idle._

#### 10. Avoid `ngDoCheck` - use Signals and `computed` instead

`ngDoCheck` runs on every change detection cycle. It is almost always a performance smell.

```typescript
// ❌ ngDoCheck for manual comparison
ngDoCheck() {
  if (this.previousValue !== this.someValue) {
    // do work
  }
}

// ✅ Use signal + computed instead
readonly derived = computed(() => expensiveWork(this.someSignal()));
```

Rule: _If you reach for `ngDoCheck`, you are fighting the framework. Use signals instead._

### Decision matrix

| Symptom                           | Check first               | Likely pattern                 | Fix                                |
| --------------------------------- | ------------------------- | ------------------------------ | ---------------------------------- |
| Slow typing / UI freezes          | Change detection strategy | `Default` instead of `OnPush`  | `OnPush` (implicit v22+), zoneless |
| Too many change detection cycles  | State origin              | Service state used as local    | Move to component signal           |
| List recreates all DOM on update  | Track identity            | `track $index` on mutable list | Add `track item.id`                |
| Stale displayed value             | Derivation                | Derived in lifecycle hook      | Use `computed()`                   |
| Memory leak on page switch        | Subscriptions             | Missing unsubscribe            | Add `takeUntilDestroyed`           |
| Slow initial bundle               | Module structure          | Eager imports                  | Lazy-load routes                   |
| Component too large               | Reasons to change         | Mixed responsibilities         | Extract service + view             |
| Heavy chart blocks initial render | Defer strategy            | Eager heavy component          | Use `@defer (on viewport)`         |
| Manual diff logic exists          | Lifecycle misuse          | `ngDoCheck`                    | Replace with `computed()`          |

### Supporting resources

| Resource               | Path                                             |
| ---------------------- | ------------------------------------------------ |
| 10 detailed examples   | `examples/performance/01-*.md` ... `10-*.md`     |
| PR review checklist    | `checklists/angular-performance-pr-checklist.md` |
| Decision matrix        | `checklists/decision-matrix.md`                  |
| System prompt          | `prompts/portable-system-prompt.md`              |
| Code review prompt     | `prompts/code-review-prompt.md`                  |
| Refactor prompt        | `prompts/refactor-prompt.md`                     |
| Teaching prompt        | `prompts/teaching-prompt.md`                     |
| Audit report template  | `templates/audit-report-template.md`             |
| PR comment template    | `templates/pr-comment-template.md`               |
| Refactor plan template | `templates/refactor-plan-template.md`            |
| Performance playbook   | `knowledge/angular-performance-playbook.md`      |

---

## Forms

### Which forms API

- **v22+**: prefer Signal Forms (`@angular/forms/signals`) for new forms:
  signal-based state, type-safe field access, schema-based validation. On v21
  they are experimental: use them only when the project accepts that.
- **Otherwise**: typed Reactive Forms (`FormGroup`, `FormControl`, `FormArray`),
  never template-driven forms.
- **Zoneless + Reactive Forms**: `setValue`, `patchValue`, `FormArray.push` and
  the like do not schedule change detection. A template that reads form state
  must get it through a signal (`toSignal(form.valueChanges)`) or a
  `markForCheck()`.

Check the exact Signal Forms API for the project version with
`search_documentation` before writing it.

### Typed Reactive Forms example

```typescript
import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";

/** Email and name form with typed controls and field-level errors. */
@Component({
  selector: "app-my-form",
  imports: [ReactiveFormsModule],
  template: `
    <form data-part="form" [formGroup]="form" (ngSubmit)="onSubmit()">
      <label data-part="field">
        <span data-part="label">Email</span>
        <input data-part="input" formControlName="email" type="email" />
        @if (form.controls.email.invalid && form.controls.email.touched) {
          <span data-part="error">{{ getError("email") }}</span>
        }
      </label>
      <button data-part="submit" [disabled]="form.invalid || submitting()">Save</button>
    </form>
  `,
})
export class MyFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly submitting = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    name: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
  });

  getError(controlName: "email" | "name"): string {
    const control = this.form.controls[controlName];

    if (control.hasError("required")) {
      return "This field is required";
    }

    if (control.hasError("email")) {
      return "Invalid email";
    }

    return "";
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
  }
}
```

### Checklist

- [ ] Signal Forms on v22+, typed Reactive Forms otherwise (never template-driven)
- [ ] Validators applied at `FormGroup`/`FormControl` level
- [ ] Field-level errors rendered after touch
- [ ] Submit button disabled when invalid or submitting

---

## See also

- [rule-mcp](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-frontend](../rule-frontend/SKILL.md) - Frontend skill index
- [rule-styleguide](../rule-styleguide/SKILL.md) - Shared frontend standards
