# Autocomplete & Combobox Guide

> **Scope:** Search & Selects | **WCAG:** 1.3.1, 1.4.1, 2.1.1, 4.1.2

## Core Rules

1. **Roles:** Input MUST have `role="combobox"`, list MUST have `role="listbox"`, options MUST have `role="option"`.
2. **Aria-expanded:** Toggle `aria-expanded` when the list opens/closes.
3. **Aria-activedescendant:** Use `aria-activedescendant` to manage focus within the list without losing cursor position in the input.
4. **Status:** Announce results count via `aria-live` region.

## Example

```html
<label for="search">Search users</label>
<div role="combobox" aria-expanded="false" aria-haspopup="listbox">
  <input id="search" type="text" aria-controls="listbox" aria-activedescendant="" />
  <ul id="listbox" role="listbox" aria-label="Results">
    <li id="opt-1" role="option">Alice</li>
    <li id="opt-2" role="option">Bob</li>
  </ul>
</div>
<div aria-live="polite" role="status">2 results available.</div>
```

## Keyboard interactions

| Key | Action |
| :--- | :--- |
| Down Arrow | Move to next option / open list |
| Up Arrow | Move to previous option |
| Enter | Select highlighted option |
| Escape | Close list / return to input |
