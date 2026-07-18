# pix-vanilla-reactive — Template Engine Capabilities (v2)

> Reference: `skills/pix-frontend-vanilla-reactive/examples/src/core/`
> Living document — update as the engine evolves.

---

## 1. Data Interpolation

| Syntax | Type | Escaped | Example |
|--------|------|---------|---------|
| `{{ expr }}` | data | ✅ | `<h1>{{ title }}</h1>` |
| `{{ expr \| raw }}` | data | ❌ | `<div>{{ htmlContent \| raw }}</div>` |

### Expression examples

| Expression | Description |
|------------|-------------|
| `{{ title }}` | Simple variable lookup |
| `{{ title \| upper }}` | Variable + filter |
| `{{ title \| truncate:20 }}` | Filter with argument |
| `{{ title \| slugify \| upper }}` | Filter chain |
| `{{ items \| length }}` | Array/string length |
| `{{ items \| join:', ' }}` | Array to string |
| `{{ date \| timeAgo }}` | Relative time |
| `{{ date \| date:'YYYY-MM-DD' }}` | Date formatting |

### Built-in filters (18)

```
upper, lower, capitalize, slugify, slug, trim,
escapeHtml, striptags, raw, json, default,
truncate, length, first, last, join,
tagLabel, tagHref, date, timeAgo, urlencode, sortBy
```

---

## 2. Expression Parsing (inside `{{ }}`)

| Form | Example | Resolves to |
|------|---------|-------------|
| Dot-path variable | `{{ todo.title }}` | `ctx.todo.title` |
| Bracket index | `{{ items[0].name }}` | `ctx.items[0].name` |
| Filter pipe | `{{ val \| upper }}` | apply filter |
| Filter chain | `{{ val \| upper \| slug }}` | chained filters |
| Filter with arg | `{{ val \| truncate:20 }}` | `filter(val, 20)` |
| Filter named arg | `{{ val \| join:', ' }}` | `filter(val, ', ')` |
| **Function call** (v2) | `{{ TodoList(todos) }}` | `ctx.TodoList(ctx.todos)` |
| Fn call dot-arg | `{{ Card(todo.item) }}` | `ctx.Card(ctx.todo.item)` |
| Raw output | `{{ html \| raw }}` | Unescaped textContent |

---

## 3. Event Binding (ALL DOM events — `@` prefix)

```
@eventname="handler"          in HTML template (Pattern A, B, C)
```

The `@` prefix extracts the event name and passes it directly to
`addEventListener()`. **No whitelist** — any valid DOM event name works.

### Mouse events

| Syntax | Event |
|--------|-------|
| `@click="handleSave"` | click (no args → auto-injects `$event`) |
| `@click="handleSave($event, id)"` | click (explicit event + arg) |
| `@dblclick="handleEdit(id)"` | double click |
| `@mousedown="onMouseDown"` | mouse down |
| `@mouseup="onMouseUp"` | mouse up |
| `@mousemove="onMouseMove"` | mouse move |
| `@mouseenter="onEnter"` | mouse enter (no bubble) |
| `@mouseleave="onLeave"` | mouse leave (no bubble) |
| `@mouseover="onOver"` | mouse over (bubbles) |
| `@mouseout="onOut"` | mouse out (bubbles) |
| `@wheel="onWheel"` | scroll wheel |
| `@contextmenu="onMenu"` | right click |

### Keyboard events

| Syntax | Event |
|--------|-------|
| `@keydown="onKeyDown"` | key down |
| `@keyup="onKeyUp"` | key up |
| `@keypress="onKeyPress"` | key press (deprecated) |

### Focus events

| Syntax | Event |
|--------|-------|
| `@focus="onFocus"` | element focused |
| `@blur="onBlur"` | element blurred |
| `@focusin="onFocusIn"` | focus in (bubbles) |
| `@focusout="onFocusOut"` | focus out (bubbles) |

### Form events

| Syntax | Event |
|--------|-------|
| `@input="onInput"` | input value changed |
| `@change="onChange"` | change committed |
| `@submit="onSubmit"` | form submitted |
| `@reset="onReset"` | form reset |
| `@invalid="onInvalid"` | validation failed |
| `@select="onSelect"` | text selected |

### Clipboard events

| Syntax | Event |
|--------|-------|
| `@copy="onCopy"` | copy |
| `@paste="onPaste"` | paste |
| `@cut="onCut"` | cut |

### Drag & Drop events

| Syntax | Event |
|--------|-------|
| `@dragstart="onDragStart"` | drag start |
| `@drag="onDrag"` | dragging |
| `@dragend="onDragEnd"` | drag end |
| `@dragenter="onDragEnter"` | drag enters target |
| `@dragover="onDragOver"` | drag over target |
| `@dragleave="onDragLeave"` | drag leaves target |
| `@drop="onDrop"` | dropped |

### Touch events

| Syntax | Event |
|--------|-------|
| `@touchstart="onTouchStart"` | touch start |
| `@touchmove="onTouchMove"` | touch move |
| `@touchend="onTouchEnd"` | touch end |
| `@touchcancel="onTouchCancel"` | touch cancel |

### Pointer events

| Syntax | Event |
|--------|-------|
| `@pointerdown="onPointerDown"` | pointer down |
| `@pointerup="onPointerUp"` | pointer up |
| `@pointermove="onPointerMove"` | pointer move |
| `@pointerenter="onPointerEnter"` | pointer enter |
| `@pointerleave="onPointerLeave"` | pointer leave |

### Window / UI events

| Syntax | Event |
|--------|-------|
| `@scroll="onScroll"` | scroll |
| `@resize="onResize"` | resize (window) |
| `@load="onLoad"` | load |
| `@error="onError"` | error |
| `@animationend="onAnimEnd"` | CSS animation end |
| `@transitionend="onTransEnd"` | CSS transition end |

### Custom events

| Syntax | Event |
|--------|-------|
| `@customevent="handler"` | `new CustomEvent('customevent')` |

**Any string** after `@` works. No registration, no whitelist.

### Handler resolution rules

| Form | Resolves to |
|------|-------------|
| `@click="handleSave"` | `_handlers.handleSave(event)` |
| `@click="handleSave(id)"` | `_handlers.handleSave(resolvedId)` |
| `@click="handleSave($event, id)"` | `_handlers.handleSave(nativeEvent, resolvedId)` |
| `@click="handleSave(id, ctx.name)"` | `_handlers.handleSave(resolvedId, resolvedName)` |

**Keywords:**
- `$event` → native DOM Event (reserved, evaluated at click-time)
- `id` → resolved from merged scope at render-time (eager)
- Handler resolved from `_handlers` object or component methods

---

## 4. Attribute Binding

| Syntax | Type | Example |
|--------|------|---------|
| `attr="{{ expr }}"` | HTML attribute | `<div class="{{ cls }}">` |
| `attr="{{ expr }}"` | Boolean-ish | `<details open="{{ isOpen }}">` |
| `attr="static"` | Static value | `<div data-part="card">` |
| `.prop="{{ expr }}"` | **DOM property** | `<input .value="{{ name }}">` |

Property binding (`.value`, `.checked`, `.selected`, `.disabled`,
`.indeterminate`, `.innerText`, `.scrollTop`) sets the DOM property
directly instead of `setAttribute()`.

---

## 5. Loops (`<for>`)

```html
<for each="item in items">
  ...body...
</for>
```

| Syntax | Example |
|--------|---------|
| `<for each="todo in ctx.todos">` | Iterates array, each item as `todo` |

The for-loop variable is available inside the `<for>` body:
- Data expressions: `{{ todo.title }}`
- Event bindings: `@click="deleteItem(todo.id)"`

Outside the `<for>` body, the variable is undefined.

**Keyed reconciliation:** uses item identity (object reference or
primitive value) for DOM reuse — add, remove, reorder without
full re-render.

---

## 6. Conditionals (`<if>`)

```html
<if condition="expr">
  ...body...
</if>
```

| Syntax | Example |
|--------|---------|
| `<if condition="todos.length === 0">` | Shows body when truthy |

Condition expression is evaluated against the merged context
(for-loop scope + render context). Truthy → show. Falsy → hide.

---

## 7. Component Composition (v2 — via `{{ FnName(args) }}`)

```html
{{ ComponentName(args) }}
```

| Syntax | Example |
|--------|---------|
| `{{ TodoList(todos) }}` | Renders a Pattern B component inline |
| `{{ ContactCard(contact) }}` | Renders another component with data |

The component function **must** be resolvable from:
- **Pattern C**: Explicitly passed in `_context`: `ctx.TodoList = TodoList`
- **Pattern A**: Available as a component method
- **Pattern B**: In closure scope via `import`, passed in context

The function receives the resolved args and **must** return a
`TemplateResult` (`{ kind: 'template-result', strings, values }`).
The `ExprPart` renders this as a nested template.

### Nesting works:

```
Pattern C (external .template.html)
  └── {{ PatternB(ctx) }}    ← fn call in {{ }}
        └── <pattern-a-ce>   ← native CE, independent lifecycle
```

---

## 8. Two-Way Binding (REMOVED in v2)

The `model` directive is removed with `${}`. Use `@input` instead:

```html
<input .value="{{ name }}" @input="onNameInput($event)">
```

With handler:

```js
const _handlers = {
  onNameInput: (e) => { store.state.name = e.target.value; },
};
```

---

## 9. Reactive Pipeline

```
1. store.state.todos = [...]       ← user mutates store
2. Proxy trap fires                ← store:change event
3. tickState.set(now)              ← Signal.State notifies
4. Signal subscribers invalidate   ← ComputedSignal marks dirty
5. Microtask flush                 ← scheduler runs effects
6. effect re-runs:
   a. renderContext.get()          ← re-evaluate ComputedSignal
   b. Component.render(ctx)        ← returns TemplateResult
   c. render(result, el)           ← TemplateInstance.updateWithContext
   d. ExprParts re-evaluate {{ }}  ← data interpolation updates
   e. ForParts reconcile           ← add/remove/move DOM nodes
   f. IfParts evaluate condition   ← show/hide
   g. ClickHandlerParts: stable    ← handlers don't change
7. DOM updated
```

All three patterns (A, B, C) use the **same pipeline**.

---

## 10. Complete Bootstrap Sequence

```js
import { Store, Signal, effect, html, render, registerFilter }
  from './core/index.js';

// 1. Store + TickState
const store = new Store({ title: 'Hello', todos: [] });
const tickState = new Signal.State(0, { equals: () => false });
window.addEventListener('store:change', () => tickState.set(performance.now()));

// 2. Filters
registerFilter('upper', v => String(v).toUpperCase());

// 3. Render context (ComputedSignal)
const renderContext = new Signal.Computed(() => {
  tickState.get();
  return { title: store.state.title, todos: store.state.todos };
});

// 4. Mount effect
effect(() => {
  const ctx = renderContext.get();
  const result = App.render(ctx);
  result._context = ctx;
  result._handlers = { handleSave };
  render(result, document.getElementById('app'));
});

// 5. Kick
tickState.set(performance.now());
```

---

> **Reference document** — part of `pix-galaxy-mcp` skill ecosystem.
> See `skills/pix-frontend-vanilla-reactive/SKILL.md` for full pattern documentation.
