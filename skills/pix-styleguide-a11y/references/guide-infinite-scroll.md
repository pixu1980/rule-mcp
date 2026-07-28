# Infinite Scroll Guide

> **Scope:** Pagination & Feeds | **WCAG:** 2.1.1, 2.4.3, 2.5.1, 4.1.3

## Core Rules

1. **Load More Button:** Prefer a "Load More" button over automatic scroll fetching — auto-fetching traps keyboard users from reaching the footer.
2. **Focus Management:** When new items load, manage focus if it was on a trigger, or announce loading via `aria-live`.
3. **Footer Access:** Ensure keyboard users can navigate past the feed.
4. **Simple Pointer Alternative:** Provide a single-click alternative to scroll-based loading.

## Example

```html
<div aria-live="polite" role="status" aria-label="Loading more items">
  10 new items loaded
</div>
<button id="load-more" type="button">Load more</button>
```

## Keyboard interactions

| Key | Action |
| :--- | :--- |
| Tab | Navigate through items to "Load More" button |
| Enter / Space | Activate "Load More" |
