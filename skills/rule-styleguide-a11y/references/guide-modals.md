# Modals & Dialogs Guide

> **Scope:** Focus trapping, native dialog element, keyboard control | **WCAG:** 1.3.1, 1.4.1, 2.1.1, 2.4.3, 4.1.2

## Core Rules

1. **Focus Trap:** When modal opens, focus moves into it. Focus is contained within. When closed, focus returns to the trigger.
2. **Labeling:** Modal MUST have `aria-labelledby` or `aria-label`.
3. **Escape:** Modal MUST close on `Escape` key.
4. **Background:** Background content MUST be inert (`aria-modal="true"` or `<dialog>` native behavior).
5. **Close button:** Always provide a visible, labeled close button.

---

## Good Examples

### Native HTML Dialog (Recommended)

```html
<dialog aria-labelledby="modal-title" closedby="any" id="confirmDialog">
  <h2 id="modal-title">Confirm Deletion</h2>
  <p>This action cannot be undone.</p>
  <button command="close" commandfor="confirmDialog" aria-label="Close">✕</button>
  <button>Delete</button>
  <button command="close" commandfor="confirmDialog">Cancel</button>
</dialog>
```

> **Note:** `closedby`, `command`, and `commandfor` (invokerCommands API) are supported in **Chrome 133+**. Check [Can I Use](https://caniuse.com) and provide a JS fallback.

### ARIA Dialog Pattern

```html
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm Deletion</h2>
  <button aria-label="Close">✕</button>
  <p>Are you sure?</p>
  <button>Delete</button>
  <button>Cancel</button>
</div>
```

### Focus Management (JavaScript)

```javascript
// When opening:
// 1. Save reference to current focus (trigger element)
// 2. Move focus to modal title or first focusable element
// 3. Trap focus inside modal (cycle Tab/Shift+Tab through modal elements)
// When closing:
// 1. Return focus to saved trigger element
```

---

## Bad Examples

```javascript
// ❌ No close button - user trapped
// ❌ Focus stays on trigger - screen reader interacts with background
// ❌ No focus trap - Tab moves outside modal
```

## Keyboard interactions

| Key       | Action                       |
| :-------- | :--------------------------- |
| Escape    | Close modal                  |
| Tab       | Cycle through modal elements |
| Shift+Tab | Cycle backward               |
