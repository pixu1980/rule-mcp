# Drag & Drop Guide

> **Scope:** Interactive Lists & Boards | **WCAG:** 2.1.1, 2.4.7, 2.5.1, 4.1.3

## Core Rules

1. **Keyboard Alternative:** Every drag/drop action MUST have a keyboard equivalent (Space to select, arrows to move, Space to drop).
2. **Aria-live Announcements:** Screen readers MUST be informed when an item is picked up, moved, and dropped via `aria-live`.
3. **Visual Cues:** Visible focus MUST track the item being moved.
4. **Simple Pointer Alternative:** Complex gestures (drag/swipe) MUST have a simple single-pointer equivalent (SC 2.5.1).

## Keyboard interactions

| Key | Action |
| :--- | :--- |
| Tab | Navigate to draggable item |
| Space | Pick up / drop item |
| Arrow keys | Move selected item |
| Escape | Cancel drag operation |

## Example

```html
<div role="list" aria-label="Sortable tasks">
  <div role="listitem" tabindex="0" aria-grabbed="false" draggable="true">
    Task 1
  </div>
  <div role="listitem" tabindex="0" aria-grabbed="false" draggable="true">
    Task 2
  </div>
</div>
<div aria-live="polite" role="status">Task 1 moved to position 2</div>
```
