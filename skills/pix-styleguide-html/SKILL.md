---
name: rule-styleguide-html
description: >-
  Use when writing semantic HTML following rule conventions. Covers the mandatory document boilerplate (doctype, charset, viewport, title, icons, canonical, Open Graph), semantic elements over div, document structure, accessibility, and element selection.
tags:
  - "html"
  - "boilerplate"
  - "doctype"
  - "head"
  - "meta"
  - "viewport"
  - "favicon"
  - "canonical"
  - "semantic"
  - "markup"
  - "accessibility"
  - "template"
frameworks: [all]
guardrails: [data-part-naming, semantic-html]
---

# HTML Style Guide and Standards

> **See also:** [`naming-and-file-tree.md`][rule-styleguide-naming](../rule-styleguide-naming/SKILL.md) for file naming conventions, `_` prefix rules, and project structure.

## Purpose and non negotiables

- HTML is the backbone of the product. Start from markup when engineering UI and when analyzing use cases.
- A solid HTML structure should reduce CSS and JS complexity.
- Every change must preserve accessibility and responsiveness. If either is broken, the change is not shippable.

## The document boilerplate - MANDATORY, every page

Start here. Not a starting point to adapt: the shell below is what a page has
before anything else is written, and a review that finds a page without it has
found a defect.

```html
<!DOCTYPE html>
<html lang="en" data-js="off">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />

    <title>Unique page title - Site name</title>

    <script>
      document.documentElement.dataset.js = "on";
    </script>

    <link rel="stylesheet" href="/css/index.css" />
    <link rel="stylesheet" href="/css/print.css" media="print" />
    <script src="/js/index.js" type="module"></script>

    <link rel="icon" href="/favicon.ico" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />

    <link rel="canonical" href="https://example.com/page" />
    <meta name="description" content="What this page is, in one sentence." />
    <meta name="color-scheme" content="light dark" />
    <meta property="og:url" content="https://example.com/page" />
    <meta property="og:image" content="https://example.com/og.jpg" />
  </head>
  <body>
    <!-- content -->
  </body>
</html>
```

### Line by line, and why

| Line                              | Why it is there                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<!DOCTYPE html>`                 | Without it the browser goes into quirks mode, and every layout rule changes underneath you                                                                    |
| `lang="en"`                       | A screen reader picks its pronunciation from this. Wrong or missing, and the page is read in the wrong language                                               |
| `charset="utf-8"`                 | **Before `<title>`.** The parser needs the encoding before it reads text, or the first non-ASCII character is already corrupt                                 |
| `viewport`, `width=device-width`  | Without it a phone renders at desktop width and scales down. Nothing else responsive matters until this is present                                            |
| `<title>`                         | Read in the tab, the bookmark, the history entry and the search result. Unique per page, and the distinctive part first                                       |
| `data-js`                         | Set to `off` in the markup and flipped by one inline script, so CSS can style the no-JavaScript case. An attribute, not a class - see the selector rule below |
| Stylesheet                        | Render-blocking by design: it is what prevents the flash of unstyled content                                                                                  |
| Print stylesheet, `media="print"` | Loaded without blocking, and someone will print the page                                                                                                      |
| `type="module"`                   | Deferred implicitly, so it runs after parsing without a `defer` attribute to forget                                                                           |
| `.ico` and `.svg` icons           | The `.ico` for older browsers, the SVG because it can respond to the color scheme                                                                             |
| `apple-touch-icon`                | The only icon iOS uses on the home screen                                                                                                                     |
| `manifest`                        | What Android reads for the installed name and icons                                                                                                           |
| `canonical`                       | One address for one page. Without it, tracking parameters become duplicate pages                                                                              |
| `description`                     | Search engines often rewrite it; social platforms use it as given                                                                                             |
| `color-scheme`                    | Tells the browser both themes are supported, so form controls and scrollbars follow the page instead of staying light                                         |
| `og:url`, `og:image`              | The preview a link produces when someone shares it. `og:url` also keeps a shared address free of the parameters it was copied with                            |

### What is deliberately not in it

- **`initial-scale=1`.** No longer necessary, and it has been copied forward for
  a decade past the devices that needed it.
- **`http-equiv="X-UA-Compatible"`.** For a browser nobody supports.
- **A `class` on `<html>`.** The zero-classes rule is not suspended for the
  document element. Use `data-js`, and select with `[data-js="off"]`.
- **`theme-color`.** One engine reads it, and it fights a page that supports both
  color schemes. Add it when a designer asks for it, not by default.
- **Render-blocking script in `<head>`.** Only when a script must run before
  first paint, which is rarer than it is claimed to be, and it must be justified
  in review.

### Add when the page needs it

`dir="rtl"` from the locale rather than hardcoded (see
[rule-styleguide-i18n](../rule-styleguide-i18n/SKILL.md)); `og:title` and
`og:type` when they differ from the page defaults; `preload` for a font the first
paint genuinely waits on; an RSS `alternate`; `viewport-fit=cover` for an
edge-to-edge layout on a notched device. Each of those is a decision. The shell
above is not.

## Semantics first - MANDATORY RULE

### No `<div>` for layout. Ever.

This is **not a suggestion**. Every `<div>` in the codebase must be justified:

- If the element has a semantic role, use the correct semantic element.
- If you cannot name what the element IS, you probably don't need it.

**`<div>` is always forbidden.** Every `<div>` in the codebase is a bug.

- Flex rows -> `<section>`
- CSS-only wrappers -> `<section>`
- Modal overlays -> `<dialog>` with `::backdrop`
- Selection overlays -> `<section>`
- SVG containers -> `<svg>`

If you cannot find a semantic element, use `<section>`.

**Forbidden uses of `<div>`**:

- `<div>` when `<section>`, `<article>`, `<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>`, `<form>`, `<ul>`, `<ol>`, `<li>`, `<figure>`, `<details>`, `<summary>`, `<dialog>` exists
- `<div data-part="header">` - use `<header>`
- `<div data-part="body">` - use `<section>` or `<main>`
- `<div data-part="footer">` - use `<footer>`
- `<div data-part="list">` - use `<ul>` or `<ol>`
- `<div data-part="nav">` - use `<nav>`
- `<div data-part="form">` - use `<form>`
- `<div data-part="search">` - use `<search>`
- `<div data-part="card">` - use `<article>`
- `<div data-part="modal">` - use `<article>` or `<dialog>`
- `<div data-part="tabs">` - use `<nav>`
- `<div data-part="item">` inside a list - use `<li>`
- `<div data-part="summary">` - use `<section>` or `<details>`
- `<div data-part="stats">` - use `<section>`
- `<div>` for a button - use `<button>`

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

## HTML that replaced a library: dialog, popover, details, datalist, inert

Each of these removes a dependency and, more importantly, removes an
accessibility implementation that every team wrote slightly differently and
slightly wrong.

### Popover is not a modal, and the difference is what it does to the page

A **popover** is non-blocking: a menu, a tooltip, a card floating beside its
trigger. The page behind stays scrollable, clickable and tabbable. A **modal**
blocks: it adds a backdrop, traps focus, and makes everything behind it inert
until it is dismissed.

Both escape normal flow into the browser's top layer, which sits above every
stacking context. That is what makes `overflow: hidden` on an ancestor, a
`transform` that creates a containing block, and `z-index` arithmetic all stop
mattering, and it is what the portal pattern existed to fake.

```html
<button popovertarget="account-menu">Account</button>
<nav id="account-menu" popover>
  <a href="/profile">Profile</a>
</nav>
```

That is the whole implementation. The `popovertarget` attribute declares the
relationship in the markup, so the browser owns it: light dismiss on an outside
click, the Escape key, focus returning to the trigger, and the expanded state
exposed to assistive technology without a hand-written attribute.

For the blocking case, `<dialog>` with `showModal()`. The browser adds the
backdrop, traps the tab ring, makes the rest of the document inert, and returns
focus on close. **Accessible focus trapping is genuinely hard, which is why the
libraries existed; the browser always knew how, it just had no element to attach
it to.**

Reach for `open()` rather than `showModal()` when the dialog should not block,
and prefer a popover when it should not block at all.

### Accordion, combobox, focus trap: the rest, without JavaScript

| Instead of                                         | Use                                                       | What the browser then owns                                                                  |
| -------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| An accordion component                             | `<details>`, and `name` on several to make them exclusive | Open and closed state, keyboard operation, find-in-page opening a closed panel              |
| A combobox for a plain suggestion list             | `<input list>` with `<datalist>`                          | Suggestions, filtering, and a free-text value that stays valid                              |
| A focus-trap utility around background content     | The `inert` attribute                                     | Removing a subtree from focus, from the tab ring and from assistive technology in one place |
| Hand-rolled hydration of a component's shadow tree | `<template shadowrootmode>`                               | Shadow DOM present in the parsed markup, so it renders before script runs                   |
| A preload heuristic                                | `fetchpriority` on the element that matters               | Ordering the request against everything else the parser found                               |

### What each semantic element buys, beyond not being a div

The rule that no `<div>` survives review is above. The reason it is worth
enforcing is that each replacement carries behavior a `<div>` cannot:

- `<button>`: keyboard activation on both Enter and Space, focus, and a role that
  says an action will happen.
- `<nav>`, `<main>`, `<header>`, `<footer>`, `<aside>`: landmarks a screen reader
  user jumps between, which is how they skip what they have already heard.
- `<h1>` through `<h6>` in order: the document outline, and the other list a
  screen reader user navigates by.
- `<ul>` and `<ol>`: the count, announced up front, so a listener knows how long
  the list is before entering it.
- `<label>` bound to its control: a click target, and the name announced when the
  field takes focus.
- `<table>` with `<th scope>`: cells announced with the header they belong to
  rather than as loose values.
- `<time datetime>`: a machine-readable instant beside the human wording.

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
- Do not add wrappers that exist only to compensate for unclear structure - fix the structure first.

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

## Formatting rules

- Use 2-space indentation.
- Keep attributes on one line unless they become long, then wrap for readability.

## Validation

- W3C markup validation is mandatory.
- Working markup is not enough - it must also follow best practices and remain valid.

---

## See also

- [rule-styleguide](../rule-styleguide/SKILL.md) - Style guides index
- [rule](../rule/SKILL.md) - Central skill index
