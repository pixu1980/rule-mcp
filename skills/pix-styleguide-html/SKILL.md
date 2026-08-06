---
name: rule-styleguide-html
description: >-
  Use when writing semantic HTML following rule conventions. Covers document structure, template engine syntax, accessibility, and element selection.
tags:
  - "html"
  - "semantic"
  - "markup"
  - "accessibility"
  - "template"
frameworks: [all]
---

# HTML Style Guide and Standards

> **See also:** [`naming-and-file-tree.md`][rule-styleguide-naming](../rule-styleguide-naming/SKILL.md) for file naming conventions, `_` prefix rules, and project structure.

## Purpose and non negotiables

- HTML is the backbone of the product. Start from markup when engineering UI and when analyzing use cases.
- A solid HTML structure should reduce CSS and JS complexity.
- Every change must preserve accessibility and responsiveness. If either is broken, the change is not shippable.

## Semantics first — MANDATORY RULE

### No `<div>` for layout. Ever.

This is **not a suggestion**. Every `<div>` in the codebase must be justified:

- If the element has a semantic role, use the correct semantic element.
- If you cannot name what the element IS, you probably don't need it.

**`<div>` is always forbidden.** Every `<div>` in the codebase is a bug.

- Flex rows → `<section>`
- CSS-only wrappers → `<section>`
- Modal overlays → `<dialog>` with `::backdrop`
- Selection overlays → `<section>`
- SVG containers → `<svg>`

If you cannot find a semantic element, use `<section>`.

**Forbidden uses of `<div>`**:

- `<div>` when `<section>`, `<article>`, `<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>`, `<form>`, `<ul>`, `<ol>`, `<li>`, `<figure>`, `<details>`, `<summary>`, `<dialog>` exists
- `<div data-part="header">` — use `<header>`
- `<div data-part="body">` — use `<section>` or `<main>`
- `<div data-part="footer">` — use `<footer>`
- `<div data-part="list">` — use `<ul>` or `<ol>`
- `<div data-part="nav">` — use `<nav>`
- `<div data-part="form">` — use `<form>`
- `<div data-part="search">` — use `<search>`
- `<div data-part="card">` — use `<article>`
- `<div data-part="modal">` — use `<article>` or `<dialog>`
- `<div data-part="tabs">` — use `<nav>`
- `<div data-part="item">` inside a list — use `<li>`
- `<div data-part="summary">` — use `<section>` or `<details>`
- `<div data-part="stats">` — use `<section>`
- `<div>` for a button — use `<button>`

### Decision table

| Use case               | `<div>` | Correct semantic element    |
| ---------------------- | ------- | --------------------------- |
| App/section header     | ❌      | `<header>`                  |
| Thematic group         | ❌      | `<section>`                 |
| Self-contained content | ❌      | `<article>`                 |
| Navigation links       | ❌      | `<nav>`                     |
| Primary content        | ❌      | `<main>`                    |
| Complementary/sidebar  | ❌      | `<aside>`                   |
| Footer/metadata        | ❌      | `<footer>`                  |
| Image + caption        | ❌      | `<figure>` + `<figcaption>` |
| Clickable action       | ❌      | `<button>`                  |
| List of items          | ❌      | `<ul>` / `<ol>` + `<li>`    |
| Search bar             | ❌      | `<search>`                  |
| Form with inputs       | ❌      | `<form>`                    |
| Tab navigation         | ❌      | `<nav>`                     |
| Flex row / CSS wrapper | ❌      | `<section>`                 |
| Modal backdrop         | ❌      | `<dialog>` + `::backdrop`   |
| Selection overlay      | ❌      | `<section>`                 |

### Other rules

- Prefer native semantics over ARIA. Add ARIA only when native elements cannot express the required meaning or behavior.
- Semantic markup improves readability and maintainability, and improves compatibility with screen readers and crawlers.
- Use MDN as reference for semantic elements.

### Semantic element decision guide

| Element                     | Use when                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `<article>`                 | Content is self-contained and independently distributable (blog post, comment, widget) |
| `<section>`                 | Content is a thematic grouping, usually with a heading                                 |
| `<nav>`                     | Contains navigation links for the page or section                                      |
| `<main>`                    | Primary content unique to this page (one per document)                                 |
| `<aside>`                   | Content tangentially related to the main content (sidebar, pullquote)                  |
| `<header>`                  | Introductory content, heading group, or navigational aids                              |
| `<footer>`                  | Metadata, copyright, related links for its parent section                              |
| `<figure>` + `<figcaption>` | Self-contained media with an optional caption                                          |

### Example: semantic structure

Do not replace structural meaning with classed divs.

```html
<!-- AVOID: generic divs for everything -->
<div class="header">
  <h1>Logo</h1>
  <div class="nav">
    <a href="#">Home</a>
    <a href="#">About</a>
  </div>
</div>
<div class="main">
  <div class="content">
    <p>Main content here.</p>
  </div>
</div>
<div class="footer">
  <p>Copyright 2026</p>
</div>
```

Prefer semantic landmarks and meaningful containers.

```html
<!-- PREFERRED: semantic landmarks -->
<header>
  <h1>Logo</h1>
  <nav>
    <a href="#">Home</a>
    <a href="#">About</a>
  </nav>
</header>
<main>
  <article>
    <h2>Article Title</h2>
    <section>
      <h3>Section Heading</h3>
      <p>Main content here.</p>
    </section>
  </article>
</main>
<footer>
  <p>Copyright 2026</p>
</footer>
```

## Accessibility essentials

- Associate `<label>` with its input via `for` and matching `id`.
- Use ARIA only when native semantics are insufficient.
- Keep markup valid and semantic to help assistive tech and validation tooling.
- See [`a11y.md`][rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md) for the full accessibility guide.

## Typography and document structure

- Use a single `<h1>` per document.
- Maintain heading order without skipping levels. If visual order needs to differ, use CSS to position elements, not incorrect heading levels.
- Use the right inline semantics for emphasis:
  - prefer `<strong>`, `<em>`, `<mark>`
  - treat `<b>` and `<i>` as last resort when no semantic alternative fits

### Headings

Avoid multiple `<h1>`.

```html
<!-- AVOID -->
<main>
  <h1>Title One</h1>
  <p>Content</p>
  <h1>Title Two</h1>
  <p>More content</p>
</main>
```

Prefer one `<h1>` and step headings correctly.

```html
<!-- PREFERRED -->
<main>
  <h1>Page Title</h1>
  <p>Content</p>
  <h2>Section Title</h2>
  <p>More content</p>
</main>
```

Avoid skipping levels.

```html
<!-- AVOID: skipping h2, h4 -->
<h1>Title</h1>
<h3>Subtitle</h3>
<h5>Detail</h5>
```

Use ordered levels.

```html
<!-- PREFERRED -->
<h1>Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

### Emphasis and highlights

Avoid presentational tags and inline style hacks for meaning.

```html
<!-- AVOID -->
<p><i>Italic</i></p>
<p><b>Bold</b></p>
<p><span style="background-color: lightyellow">Highlight</span></p>
```

Prefer semantic tags, then style them with CSS.

```html
<!-- PREFERRED -->
<p><em>Italic</em></p>
<p><strong>Bold</strong></p>
<p><mark>Highlight</mark></p>
```

## Media and figures

- Use `<figure>` plus `<figcaption>` when an image needs a caption.
- Provide meaningful `alt` text for images.

Avoid non semantic caption wrappers.

```html
<!-- AVOID -->
<div>
  <img src="photo.jpg" alt="Description" />
  <p>Caption text</p>
</div>
```

Prefer figure semantics.

```html
<!-- PREFERRED -->
<figure>
  <img src="photo.jpg" alt="Description" />
  <figcaption>Caption text</figcaption>
</figure>
```

## Structure and minimalism

- Keep markup minimal and readable.
- Prefer descriptive class names when classes are needed.
- Do not add wrappers that exist only to compensate for unclear structure — fix the structure first.

## Valid nesting and layout rules

- Do not place block level elements inside inline level elements.
- Do not wrap `<p>` inside `<a>`.

```html
<!-- AVOID -->
<a href="https://example.com">
  <p>Company Software</p>
</a>
```

Prefer an inline link inside a block container.

```html
<!-- PREFERRED -->
<p>
  <a href="https://example.com">Company Software</a>
</p>
```

## Template engine syntax rules

- This project uses a custom template engine with `<for>`, `<if>`, `<switch>`, `<extends>`, `<block>`, `<include>` directives.
- Never use Liquid or Jekyll `{% %}` syntax.

### Conditionals

```html
<if condition="expression">
  <p>Content when truthy</p>
  <elseif condition="otherExpression"></elseif>
  <p>Other content</p>
  <else></else>
  <p>Fallback content</p>
</if>
```

### Loops

```html
<for each="item in items"> {{ item.property }} </for>

<for each="todo in visibleTodos"> ${TodoItem(todo)} </for>
```

### Template inheritance

```html
<extends src="layouts/base.html"></extends>
<block name="title">Page Title</block>
<block name="content">
  <p>Content</p>
</block>
```

### Includes with data

```html
<include src="../components/header.html" data='{ "current": "home" }'></include>
```

## Formatting rules

- Use 2-space indentation.
- Keep attributes on one line unless they become long, then wrap for readability.

## Validation

- W3C markup validation is mandatory.
- Working markup is not enough — it must also follow best practices and remain valid.

---

## See also

- [rule-styleguide](../rule-styleguide/SKILL.md) — Style guides index
- [rule](../rule/SKILL.md) — Central skill index
