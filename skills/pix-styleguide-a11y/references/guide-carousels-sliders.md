# Carousels & Sliders Guide

> **Scope:** Sliding Content | **WCAG:** 2.1.1, 2.2.2, 2.3.1, 4.1.2

## Core Rules

1. **Pause Control:** Auto-playing carousels MUST have a mechanism to pause/stop.
2. **Buttons:** Previous/Next buttons MUST be `<button>` elements with `aria-label`.
3. **Hidden Slides:** Slides not visible MUST have `aria-hidden="true"` and `tabindex="-1"` so keyboard users do not focus off-screen content.
4. **Motion:** Respect `@media (prefers-reduced-motion)` - disable auto-play when user prefers reduced motion.

## Example

```html
<div role="region" aria-label="Featured articles" aria-roledescription="carousel">
  <button aria-label="Previous slide" aria-controls="carousel-slides">‹</button>
  <div id="carousel-slides">
    <div role="group" aria-roledescription="slide" aria-label="1 of 3">
      <img src="slide1.jpg" alt="Description" />
    </div>
    <div role="group" aria-roledescription="slide" aria-label="2 of 3" hidden aria-hidden="true">...</div>
  </div>
  <button aria-label="Next slide" aria-controls="carousel-slides">›</button>
  <button aria-label="Pause auto-rotation">⏸</button>
</div>
```

## Keyboard interactions

| Key           | Action                        |
| :------------ | :---------------------------- |
| Tab           | Navigate to carousel controls |
| Enter / Space | Activate button               |
