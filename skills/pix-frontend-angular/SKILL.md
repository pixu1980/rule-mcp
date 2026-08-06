---
name: rule-frontend-angular
description: >-
  Use when building Angular standalone components. Follows rule principles: zero CSS classes, semantic HTML, barrel file tree, data-part selectors.
tags:
  - "frontend"
  - "angular"
frameworks: [angular]
---

# rule-frontend-angular — Angular with rule Principles

This skill adapts [rule-styleguide](../rule-styleguide/SKILL.md) and
[rule-frontend-vanilla-reactive](../rule-frontend-vanilla-reactive/SKILL.md) to **Angular standalone components**.

## Core Rules (inherited from rule skills)

1. **Zero CSS classes** — only element selectors + `[data-part="..."]` + `[data-*]`
2. **Zero inline styles** — external `.css` files only (`styleUrls` / `@Component.styles`)
3. **Semantic HTML is mandatory** — never `<div>` where a semantic element exists
4. **Barrel pattern** — every component folder has `index.ts`
5. **No Angular Material CDK Overlay inline styles** — use CSS `[data-part]` instead
6. **Standalone components** — no NgModules, `standalone: true`

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
import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
  selector: "todo-item",
  standalone: true,
  styleUrls: ["./_TodoItem.component.css"],
  template: `
    <article data-part="item" [attr.data-state-completed]="todo.completed ? 'done' : null">
      <input type="checkbox" data-part="toggle" [checked]="todo.completed" (change)="toggle.emit(todo.id)" />
      <span data-part="title">{{ todo.title }}</span>
      <button data-part="delete" (click)="delete.emit(todo.id)">Delete</button>
    </article>
  `,
})
export class TodoItem {
  @Input({ required: true }) todo!: { id: string; title: string; completed: boolean };
  @Output() toggle = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
}
```

```css
/* components/TodoItem/_TodoItem.component.css */
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

## Angular ↔ rule-frontend-vanilla-reactive Mapping

| rule-frontend-vanilla-reactive | Angular Equivalent                            |
| ----------------------------- | --------------------------------------------- |
| `StateSignal`                 | `signal()` (Angular 16+) / `BehaviorSubject`  |
| `ComputedSignal`              | `computed()`                                  |
| `effect()`                    | `effect()`                                    |
| `Store (Proxy)`               | Service + `signal()`                          |
| `html\`\`` tagged templates   | Component `template`                          |
| `{{ expr }}`                  | `{{ expr }}`                                  |
| `@click=${fn}`                | `(click)="fn()"`                              |
| `model={...}` directive       | `[(ngModel)]` or `[value]` + `(input)`        |
| `<for each="x in xs">`        | `*ngFor="let x of xs"` or `@for (x of xs)`    |
| `<if condition="c">`          | `*ngIf="c"` or `@if (c)`                      |
| `adoptedStyleSheets`          | `styleUrls` in @Component decorator           |
| `data-part="..."`             | `data-part="..."` or `[attr.data-part]="..."` |
| `static {}` block             | Module-level CSS via `styleUrls`              |

## CSS Loading — Angular Style

Use Angular's native `styleUrls` in the `@Component` decorator.
No fetch/adoptedStyleSheets needed — Angular handles scoped CSS loading.

```typescript
@Component({
  selector: "my-component",
  standalone: true,
  styleUrls: ["./_MyComponent.component.css"],
  template: `...`,
})
export class MyComponent {}
```

## Lists and Conditionals (Angular 17+ @ syntax)

```typescript
@Component({
  template: `
    <section data-part="list">
      @if (todos.length > 0) {
        <ul data-part="items">
          @for (todo of todos; track todo.id) {
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
  todos: Todo[] = [];
}
```

## Barrel Pattern

```typescript
// components/TodoItem/index.ts
export { TodoItem } from "./_TodoItem.component";
```

---

## Guardrails (Testable Assertions)

- [ ] **guardrail-no-css-classes**: CSS uses element + [data-part="..."] + [data-*] selectors only. Zero .class selectors.
- [ ] **guardrail-no-inline-styles**: Templates have zero style="..." attributes. External CSS via `styleUrls` in @Component.
- [ ] **guardrail-semantic-html**: No <div> where <header>/<section>/<article>/<footer>/<nav>/<main>/<aside>/<form>/<ul>/<ol>/<li> exists.
- [ ] **guardrail-external-css**: CSS loaded as external file via Angular `styleUrls`. No fetch/adoptedStyleSheets needed.
- [ ] **guardrail-barrel-file**: Component folder has index.ts barrel. Files: _PascalCase.ext.
- [ ] **guardrail-data-part**: Child elements use data-part="role" instead of class names.
- [ ] **guardrail-no-framework-css**: No CSS-in-JS, no CSS Modules, no Tailwind. Pure external CSS only.
- [ ] **guardrail-angular-specific**: Follows Angular rule-frontend-angular conventions. Use `styleUrls`, `standalone: true`, signals for state management.
- [ ] **guardrail-jsdoc-required**: Every JS/TS file MUST have complete JSDoc on all exported symbols (see rule-styleguide → javascript.md).
- [ ] **guardrail-css-comments-required**: Every CSS file MUST have file-level + section comments (see rule-styleguide → css.md).
- [ ] **guardrail-a11y-test-required**: Every project MUST have Playwright + @axe-core/playwright a11y tests in `tests/a11y/` (see rule-styleguide → a11y.md → Automated Testing).

## Project Scaffolding

All rule projects include standard config files. See [`rule-styleguide`](../rule-styleguide/SKILL.md) → Project Scaffolding.
Use `pix_styleguide mode=scaffold` or `pix_scaffold` to generate: `.prettierrc`, `.nvmrc`, `.editorconfig`,
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

1. **Change detection is the key lever.** Default strategy checks every component on any async event. `OnPush` checks only when inputs change, events fire, or async pipes emit.

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

#### 1. Use `OnPush` change detection by default

`ChangeDetectionStrategy.OnPush` reduces unnecessary checks. Components update only when inputs change, events fire, or async pipes emit.

```typescript
@Component({
  selector: "my-component",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
export class MyComponent {}
```

Rule: _Set `OnPush` on every component. Use `Default` only when you have a specific reason and understand the cost._

#### 2. Prefer Signals over `BehaviorSubject` + `async` pipe

`signal()` is simpler, zone-independent, and enables zoneless change detection.

```typescript
// ❌ RxJS for component state
private dataSubject = new BehaviorSubject<Data | null>(null);
data$ = this.dataSubject.asObservable();

// ✅ Signal — simpler, zoneless-ready
private dataSignal = signal<Data | null>(null);
readonly data = this.dataSignal.asReadonly();
```

Rule: _Use `signal()` for local state, RxJS for complex async streams (debounce, combineLatest, etc.)._

#### 3. Always use `track` / `trackBy` in `@for`

Without tracking, Angular removes and recreates every DOM element on every list change.

```html
<!-- ❌ Angular 17+ @for without track recreates all -->
@for (item of items; track item.id) {
<li data-part="item">{{ item.title }}</li>
}

<!-- ❌ Angular legacy ngFor with index -->
<li *ngFor="let item of items; let i = index" [attr.data-part]="'item'">{{ item.title }}</li>
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
// ❌ Memory leak — no unsubscribe
this.route.params.subscribe((params) => {
  this.loadData(params.id);
});

// ✅ takeUntilDestroyed (Angular 16+)
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

this.route.params.pipe(takeUntilDestroyed()).subscribe((params) => {
  this.loadData(params.id);
});
```

Rule: _Every subscription must be cleaned up. Prefer `takeUntilDestroyed` over manual `ngOnDestroy` Subject._

#### 6. Keep state in the component, not in global singletons

Service state persists across routes. Component-scoped state via `signal()` should be the default.

```typescript
// ✅ Local state — scoped to component
@Component({ standalone: true, ... })
export class SearchComponent {
  private searchTerm = signal("");
}
```

Share state via services only when multiple unrelated components need the same data.

Rule: _Local state in `signal()`, shared state in service with `signal()`, async streams in RxJS._

#### 7. Lazy-load feature routes

Every route should be lazy-loaded. Never import everything in the root module.

```typescript
// routes.ts — lazy by default
export const routes: Routes = [
  {
    path: "admin",
    loadComponent: () => import("./admin/_AdminPanel.component"),
  },
];
```

Rule: _Every route is lazy. `loadComponent` / `loadChildren` by default._

#### 8. One responsibility = one reason to change

Split when data fetching, state transitions, formatting, and UI layout change for different reasons.

```typescript
// ✅ Service handles data
@Injectable({ providedIn: "root" })
export class UserService {
  readonly user = signal<User | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  loadUser(id: string) { /* ... */ }
}

// ✅ Component handles display only
@Component({ standalone: true, ... })
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

#### 10. Avoid `ngDoCheck` — use Signals and `computed` instead

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

| Symptom                           | Check first               | Likely pattern                | Fix                             |
| --------------------------------- | ------------------------- | ----------------------------- | ------------------------------- |
| Slow typing / UI freezes          | Change detection strategy | `Default` instead of `OnPush` | Set `OnPush` on every component |
| Too many change detection cycles  | State origin              | Service state used as local   | Move to component signal        |
| List recreates all DOM on update  | Track identity            | Missing `track` in `@for`     | Add `track item.id`             |
| Stale displayed value             | Derivation                | Derived in lifecycle hook     | Use `computed()`                |
| Memory leak on page switch        | Subscriptions             | Missing unsubscribe           | Add `takeUntilDestroyed`        |
| Slow initial bundle               | Module structure          | Eager imports                 | Lazy-load routes                |
| Component too large               | Reasons to change         | Mixed responsibilities        | Extract service + view          |
| Heavy chart blocks initial render | Defer strategy            | Eager heavy component         | Use `@defer (on viewport)`      |
| Manual diff logic exists          | Lifecycle misuse          | `ngDoCheck`                   | Replace with `computed()`       |

### Supporting resources

| Resource               | Path                                             |
| ---------------------- | ------------------------------------------------ |
| 10 detailed examples   | `examples/performance/01-*.md` … `10-*.md`       |
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

## Forms (Angular Reactive Forms)

### Prerequisites

- Use Angular Reactive Forms (`FormGroup`, `FormControl`, `FormArray`)
- Use `zod` with custom validators for schema validation
- Prefer Reactive Forms over Template-Driven Forms

### Step 1 — Define form with validation

```typescript
import { Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";

@Component({
  selector: "app-my-form",
  template: `
    <form data-part="form" [formGroup]="form" (ngSubmit)="onSubmit()">
      <label data-part="field">
        <span data-part="label">Email</span>
        <input data-part="input" formControlName="email" type="email" />
        <span data-part="error" *ngIf="form.get('email')?.invalid && form.get('email')?.touched">
          {{ getError("email") }}
        </span>
      </label>
      <button data-part="submit" [disabled]="form.invalid || submitting">Save</button>
    </form>
  `,
})
export class MyFormComponent {
  form: FormGroup;
  submitting = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      name: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    });
  }

  getError(controlName: string): string {
    const control = this.form.get(controlName);
    if (control?.hasError("required")) return "This field is required";
    if (control?.hasError("email")) return "Invalid email";
    return "";
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting = true;
  }
}
```

### Checklist

- [ ] Reactive Forms (not template-driven) used
- [ ] Validators applied at `FormGroup`/`FormControl` level
- [ ] Field-level errors rendered after touch
- [ ] Submit button disabled when invalid or submitting

---

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
- [rule-frontend](../rule-frontend/SKILL.md) — Frontend skill index
- [rule-styleguide](../rule-styleguide/SKILL.md) — Shared frontend standards
