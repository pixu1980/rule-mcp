# Framework Mapping Guide

> **Target:** Semantic Equivalence | **Scope:** AI Code Generation

The examples in this skill use **React/TSX** syntax for ubiquity. The underlying accessibility requirements (ARIA attributes, semantic HTML, keyboard events) are **framework-agnostic**.

When generating or reviewing code, **transpose** these patterns into the active framework while preserving semantic equivalence.

> **Scope: web frameworks only.** ARIA and DOM events do not exist on native platforms. For iOS, Android, React Native, or Flutter, use [`guide-platform-native.md`](./guide-platform-native.md).

## Core Translation Rules

1. **Native over Custom:** Always prefer the framework's native implementation of a semantic element.
2. **Reactivity:** Map dynamic ARIA states to the framework's state binding syntax.
3. **Event Listeners:** Map keyboard event listeners to the framework's idiomatic event handling.

---

## 1. Vue.js / Nuxt

| Concept        | Syntax                             |
| :------------- | :--------------------------------- |
| State binding  | `:aria-expanded="isOpen"` (v-bind) |
| Event handling | `@keydown.enter="submit"`          |
| Focus          | `$refs.element.focus()`            |

```html
<button :aria-pressed="isActive" @click="isActive = !isActive">Toggle</button>
```

## 2. Angular

| Concept        | Syntax                                                |
| :------------- | :---------------------------------------------------- |
| State binding  | `[attr.aria-expanded]="isOpen"` (note `attr.` prefix) |
| Event handling | `(keydown.enter)="submit()"`                          |
| Focus          | `@ViewChild` + `ElementRef`                           |

```html
<button [attr.aria-pressed]="isActive" (click)="isActive = !isActive">Toggle</button>
```

## 3. Svelte

| Concept        | Syntax                            |
| :------------- | :-------------------------------- |
| State binding  | `aria-expanded={isOpen}`          |
| Event handling | `on:keydown`                      |
| Directives     | `use:focusTrap` for complex logic |

```html
<button aria-pressed="{isActive}" on:click="{()" ="">isActive = !isActive}> Toggle</button>
```

## 4. SolidJS

| Concept        | Syntax                                     |
| :------------- | :----------------------------------------- |
| State binding  | `aria-expanded={isOpen()}` (invoke signal) |
| Event handling | `onKeyDown={(e) => ...}`                   |

```jsx
<button aria-pressed={isActive()} onClick={() => setIsActive(!isActive())}>
  Toggle
</button>
```

## 5. Vanilla JS / Web Components (Lit)

| Concept            | Syntax                                                                                    |
| :----------------- | :---------------------------------------------------------------------------------------- |
| State binding      | `.ariaExpanded=${this.isOpen}` or `?aria-hidden=${this.isHidden}`                         |
| Shadow DOM caution | `aria-controls` / `aria-describedby` IDs do not cross Shadow DOM — use `ElementInternals` |

```js
html`<button .ariaPressed=${this.isActive} @click=${this.toggle}>Toggle</button>`;
```

---

## Translation Example: Destructive Confirmation Modal

### React/TSX (Source)

```tsx
<dialog aria-labelledby="modal-title" ref={dialogRef}>
  <h2 id="modal-title">Confirm deletion</h2>
  <p>This action cannot be undone.</p>
  <button onClick={confirm}>Delete</button>
  <button onClick={cancel}>Cancel</button>
</dialog>
```

### Vue.js

```html
<dialog aria-labelledby="modal-title" ref="dialogRef">
  <h2 id="modal-title">Confirm deletion</h2>
  <p>This action cannot be undone.</p>
  <button @click="confirm">Delete</button>
  <button @click="cancel">Cancel</button>
</dialog>
```
