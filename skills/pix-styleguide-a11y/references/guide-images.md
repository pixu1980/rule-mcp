# Images & Alternative Text Guide

> **Scope:** Alt text strategy, decorative images, complex images (charts/diagrams), SVG | **WCAG:** 1.1.1, 1.4.5

## Core Rules

1. **Informative images:** `alt` must convey the **conclusion**, not describe the file.
2. **Functional images (links/buttons):** `alt` must describe the **action**, not the appearance.
3. **Decorative images:** Use `alt=""` (empty) — never omit the `alt` attribute.
4. **No "Image of..." or "Photo of..."** — screen readers already announce it's an image.
5. **SVG icons:** Use `aria-hidden="true"` + `focusable="false"` on decorative SVGs.

## Good Examples

```html
<!-- Informative: describes the conclusion -->
<img src="sales-chart.png" alt="Bar chart showing 20% sales growth in Q1.">

<!-- Functional: describes the action -->
<a href="/print">
  <img src="printer-icon.png" alt="Print document">
</a>

<!-- Decorative: hidden from screen readers -->
<img src="pretty-divider.png" alt="">
```

## Bad Examples

```html
<!-- ❌ Vague — doesn't convey information -->
<img src="sales-chart.png" alt="Sales chart">

<!-- ❌ Missing alt — screen reader reads filename -->
<img src="image-123-final.png">
```

## Complex Images (Charts, Diagrams)

For complex images, provide a longer description:

```html
<figure>
  <img src="quarterly-results.png" alt="Bar chart showing quarterly revenue trends.">
  <figcaption>Revenue grew from $1.2M (Q1) to $1.8M (Q3), with a dip in Q2 at $1.0M.</figcaption>
</figure>
```

## Tip for AI

Whenever generating a component with an image, ask: *"If I remove this image, what information does the user lose?"* That answer should be your `alt`.
