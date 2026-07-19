---
name: rule-styleguide-a11y
description: >-
  Use when ensuring WCAG 2.2 AA accessibility compliance. Covers semantic HTML, ARIA, keyboard navigation, color contrast, and Playwright + axe-core testing.
tags:
  - "accessibility"
  - "a11y"
  - "wcag"
  - "aria"
  - "playwright"
  - "axe-core"
  - "eaa"
frameworks: [all]
---

# Accessibility Guide — WCAG 2.2 AA

> **See also:** [`naming-and-file-tree.md`][rule-styleguide-naming](../rule-styleguide-naming/SKILL.md) for project structure, and [`html.md`][rule-styleguide-html](../rule-styleguide-html/SKILL.md) for semantic HTML conventions.

## Scope

This guide enforces **WCAG 2.2 Level AA** compliance for all frontend code.
Every PR must pass these requirements — no exceptions.

---

## 1. Semantic HTML (Mandatory)

Semantic HTML is the foundation of accessibility. **Do not use `<div>` or `<span>` for layout containers when a semantic element exists.**

### Decision table

| Element | When to use | Never use `<div>` when |
|---------|-------------|----------------------|
| `<header>` | Introductory content, heading group, site header, search bar | Content is at the top of a section/page |
| `<main>` | Primary content unique to this page | One per document |
| `<footer>` | Metadata, copyright, related links for its parent | Content is at the bottom of a section/page |
| `<nav>` | Navigation links for the page or section | Links form a navigation menu |
| `<article>` | Self-contained, independently distributable content (blog post, comment, widget) | Content makes sense on its own |
| `<section>` | Thematic grouping of content, usually with a heading | Content is a distinct part of a larger whole |
| `<aside>` | Content tangentially related to the main content (sidebar, pullquote) | Content complements but is not essential |
| `<figure>` + `<figcaption>` | Self-contained media (image, diagram, code block) with optional caption | Media needs a caption |
| `<button>` | Action triggering a state change (submit, close, toggle) | An element is clickable and does not navigate |
| `<label>` | Describing a form control | A form input needs a descriptive label |
| `<form>` | A group of interactive controls for submitting data | Inputs collect and submit data |
| `<table>` | Tabular data with rows and columns | Data requires row/column relationships |
| `<table>` for calendar grids | A month/week calendar **is** tabular data (days × weeks) | A grid of days/weeks is rendered — use `<table>` + `<thead>`/`<tbody>`/`<th scope="col">`/`<td>` |

### Example: semantic vs non-semantic

```html
<!-- ❌ VIOLATION: generic divs for everything -->
<div class="card">
  <div class="card-title">Title</div>
  <div class="card-body">Content</div>
</div>

<!-- ✅ CORRECT: semantic elements -->
<article>
  <h2>Title</h2>
  <p>Content</p>
</article>
```

```html
<!-- ❌ VIOLATION: div as clickable -->
<div class="btn" onclick="submit()">Submit</div>

<!-- ✅ CORRECT: native button -->
<button type="submit">Submit</button>
```

### Landmarks

Every page must have at least these landmarks:

```html
<body>
  <header>
    <nav>...</nav>        <!-- Site navigation -->
  </header>
  <main>
    <article>...</article> <!-- Primary content or listing -->
  </main>
  <footer>...</footer>
</body>
```

---

### Calendar Grids — Use `<table>`

A month or week calendar **is tabular data**: it represents days (columns) × weeks (rows).
Using `<ol>`/`<li>` with ARIA roles for grids creates role conflicts (implicit `listitem` vs explicit `gridcell`/`row`).

**Always use `<table>` for calendar grids.**

```html
<!-- ✅ CORRECT: semantic <table> for calendar grid -->
<table aria-label="June 2026">
  <thead>
    <tr>
      <th scope="col" abbr="Monday">M</th>
      <th scope="col" abbr="Tuesday">T</th>
      <th scope="col" abbr="Wednesday">W</th>
      <!-- … -->
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span>1</span></td>
      <td><span>2</span></td>
      <!-- … -->
    </tr>
  </tbody>
</table>
```

Benefits:
- No ARIA role conflicts (no `listitem` vs `gridcell` clash)
- Built-in screen reader semantics (`columnheader`, `row`, `grid`)
- `table-layout: fixed` gives uniform cell widths
- `border-collapse: collapse` for clean borders
- Styling via element selectors (`th`, `td`, `tr`, `thead`, `tbody`)

---

## 2. Headings and Document Outline

* Exactly one `<h1>` per page.
* Heading levels must not be skipped (`h1` → `h2` → `h3`, never `h1` → `h3`).
* Visual hierarchy is controlled by CSS, not by skipping heading levels.
* Use heading level to reflect the document structure, not font size.

```html
<!-- ✅ CORRECT -->
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>
  <h2>Another Section</h2>

<!-- ❌ VIOLATION: skipped level -->
<h1>Page Title</h1>
  <h3>Subsection</h3>
```

---

## 3. Forms and Inputs

* Every `<input>`, `<select>`, `<textarea>` must have an associated `<label>`.
* Use explicit association via `for` + `id` (not wrapping).

```html
<!-- ✅ CORRECT -->
<label for="email">Email address</label>
<input id="email" type="email" name="email" />

<!-- ❌ VIOLATION: no label -->
<input type="text" placeholder="Email address" />
```

* Required fields must have `required` attribute and/or `aria-required="true"`.
* Error messages must be programmatically associated using `aria-describedby`.

```html
<label for="name">Name (required)</label>
<input id="name" required aria-required="true" aria-describedby="name-error" />
<span id="name-error" role="alert">Name is required</span>
```

---

## 4. Color and Contrast

* **Text**: minimum contrast ratio of **4.5:1** (AA normal text), **3:1** for large text (≥18px bold or ≥24px).
* **Non-text**: UI components and graphical objects must have at least **3:1** contrast against adjacent colors.
* Do not use color alone to convey information. Add icons, underlines, or text labels.

```css
/* ✅ CORRECT: color + underline for links */
a { color: #1a73e8; text-decoration: underline; }

/* ❌ VIOLATION: color-only distinction */
.error { color: red; }
.success { color: green; }
```

* Focus indicators must have at least **3:1** contrast ratio against the focused element's background.

---

## 5. Focus and Keyboard Navigation

* All interactive elements must be keyboard accessible (`Tab`, `Enter`, `Esc`, arrow keys).
* Never remove `:focus` outlines. Style them to match the design instead.

```css
/* ✅ CORRECT: styled focus ring */
button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* ❌ VIOLATION: removing focus */
button:focus { outline: none; }
```

* Focus order must match the visual reading order (logical DOM order).
* Skip links must be provided for pages with extensive navigation.

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<main id="main-content">...</main>
```

* Custom interactive widgets must implement WAI-ARIA authoring practices (combobox, dialog, tabs, etc.).

---

## Reference

Load references/EAA.md for the European Accessibility Act compliance checklist and detailed WCAG reference.
