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
    <article
      data-part="item"
      [attr.data-state-completed]="todo.completed ? 'done' : null"
    >
      <input
        type="checkbox"
        data-part="toggle"
        [checked]="todo.completed"
        (change)="toggle.emit(todo.id)"
      />
      <span data-part="title">{{ todo.title }}</span>
      <button data-part="delete" (click)="delete.emit(todo.id)">
        Delete
      </button>
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

| rule-frontend-vanilla-reactive | Angular Equivalent |
|----------------------|-------------------|
| `StateSignal` | `signal()` (Angular 16+) / `BehaviorSubject` |
| `ComputedSignal` | `computed()` |
| `effect()` | `effect()` |
| `Store (Proxy)` | Service + `signal()` |
| `html\`\`` tagged templates | Component `template` |
| `{{ expr }}` | `{{ expr }}` |
| `@click=${fn}` | `(click)="fn()"` |
| `model={...}` directive | `[(ngModel)]` or `[value]` + `(input)` |
| `<for each="x in xs">` | `*ngFor="let x of xs"` or `@for (x of xs)` |
| `<if condition="c">` | `*ngIf="c"` or `@if (c)` |
| `adoptedStyleSheets` | `styleUrls` in @Component decorator |
| `data-part="..."` | `data-part="..."` or `[attr.data-part]="..."` |
| `static {}` block | Module-level CSS via `styleUrls` |

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
export class MyComponent { }
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
export class TodoList { todos: Todo[] = []; }
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

## Reference

Load references/REFERENCE.md for detailed Angular patterns and API reference.
