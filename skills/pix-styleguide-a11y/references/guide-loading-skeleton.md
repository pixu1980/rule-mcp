# Loading & Skeletons Guide

> **Scope:** Loading States | **WCAG:** 2.2.1, 2.3.1, 4.1.3

## Core Rules

1. **Aria-busy:** Use `aria-busy="true"` on the container being updated.
2. **Announcement:** Screen readers should be informed of loading state via polite live regions.
3. **Motion:** Respect `@media (prefers-reduced-motion)` for skeleton pulse animations.
4. **Progress:** For deterministic loading, use `role="progressbar"` with `aria-valuenow`.

## Example

```html
<!-- Skeleton container -->
<div aria-busy="true" aria-label="Loading content">
  <div class="skeleton-line" aria-hidden="true"></div>
  <div class="skeleton-line" aria-hidden="true"></div>
</div>

<!-- Loading announcement -->
<div aria-live="polite" role="status">Loading search results...</div>

<!-- Progress bar -->
<div role="progressbar" aria-valuenow="70" aria-valuemin="0" aria-valuemax="100">
  70%
</div>
```

## CSS: Respect Reduced Motion

```css
.skeleton-line {
  animation: pulse 1.5s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-line {
    animation: none;
    opacity: 0.5;
  }
}
```
