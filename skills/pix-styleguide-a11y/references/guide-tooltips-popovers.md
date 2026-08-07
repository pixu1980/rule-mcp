# Tooltips & Popovers Guide

> **Scope:** Contextual Information | **WCAG:** 1.4.1, 1.4.13, 2.1.1, 2.4.3, 4.1.2

## Core Rules

1. **Trigger:** Must be focusable (button, link) - not just hoverable.
2. **Hover/Focus:** Tooltip MUST appear on both hover and keyboard focus.
3. **Dismissible:** Tooltip MUST be dismissible via `Escape` key.
4. **Persistent:** Tooltip MUST NOT disappear when the mouse moves over it (hoverable).
5. **Content:** Tooltip content must be accessible and may use `aria-describedby` on the trigger.

## Example

```html
<button aria-describedby="tooltip-1" type="button">Save</button>
<div role="tooltip" id="tooltip-1">Save changes to your profile</div>
```

## CSS

```css
[role="tooltip"] {
  display: none;
  position: absolute;
  /* styling */
}

button:hover + [role="tooltip"],
button:focus + [role="tooltip"],
button:focus-visible + [role="tooltip"],
[role="tooltip"]:hover {
  display: block;
}
```

## Popovers

For richer popovers (menus, datepickers):

```html
<button aria-expanded="false" aria-haspopup="true" aria-controls="popover-1" type="button">More options</button>
<div id="popover-1" role="menu" aria-labelledby="popover-trigger">
  <button role="menuitem">Edit</button>
  <button role="menuitem">Delete</button>
</div>
```

## Keyboard interactions

| Key           | Action                  |
| :------------ | :---------------------- |
| Escape        | Dismiss tooltip/popover |
| Tab           | Move to/from trigger    |
| Enter / Space | Open popover            |
