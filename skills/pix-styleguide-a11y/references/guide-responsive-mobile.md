# Responsive Web & Zoom Guide

> **Scope:** Web layout, browser zoom & touch | **WCAG:** 1.3.4, 1.4.4, 1.4.10, 2.5.1, 2.5.8

**For native mobile apps (iOS, Android, React Native, Flutter), see** [`guide-platform-native.md`](./guide-platform-native.md) **- this guide covers the browser only.**

## Core Rules

1. **Text Resize (SC 1.4.4):** UI MUST NOT break, clip, or lose function up to **200% text zoom**. Use relative units (rem/em).
2. **Reflow (SC 1.4.10):** Content MUST reflow at **320 CSS px width** (≈400% zoom on 1280px viewport) without two-dimensional scrolling - except content requiring 2D layout (data tables, maps, charts).
3. **Orientation (SC 1.3.4):** MUST NOT lock orientation to landscape or portrait unless essential.
4. **Touch Targets (SC 2.5.8 + House Rule†):** 24×24 CSS px is the normative AA floor; design to **44×44px** on touch surfaces (Apple HIG / Material norm).
5. **Gestures (SC 2.5.1):** Complex gestures (swipes, multipoint) MUST have simple single-pointer equivalents.

## CSS Implementation

```css
/* Use relative units for text */
body {
  font-size: 100%; /* Browser default (16px) */
}

h1 {
  font-size: 2rem;
}
p {
  font-size: 1rem;
}

/* Reflow: single-column by default */
.container {
  max-width: 100%;
  padding: 1rem;
}

/* Responsive grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
```

## Touch Targets

```css
/* Expand hit area without expanding visual size */
.btn-small {
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
}
```

## Viewport Meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```
