---
name: rule-styleguide-css
description: >-
  Use when writing CSS following rule architecture. Covers data-part selectors, element selectors, cascade layers, custom properties, and responsive design.
tags:
  - "css"
  - "styling"
  - "selectors"
  - "layout"
  - "responsive"
  - "design"
frameworks: [all]
---

# CSS Style Guide and Standards

> **See also:** [`naming-and-file-tree.md`][rule-styleguide-naming](../rule-styleguide-naming/SKILL.md) for file naming conventions (`_Component.css`), `_` prefix rules, and project structure.

## Core mindset

- Mastering CSS is a continuous process, it requires practice and repetition.
- Treat CSS as a creative tool for building identity, appeal, and consistency, without sacrificing pragmatism, semantics, or accessibility.
- Make learning a habit, think in HTML plus CSS.

## Architecture and organization

- Write styles in pure native vanilla CSS.
- Use `@layer` to structure the cascade and keep conflicts predictable. Organize at least: base, components, utilities.
- Use CSS custom properties for colors, spacing, typography, and other reusable decisions.
- Keep selectors shallow and scoped to components.
- Avoid `!important` unless absolutely necessary.
- Keep CSS modular: each CSS file should stay roughly between 50 and 100 lines. If it grows beyond that, split into sub files and `@import` them from an entry file.
- Separate global vs local styles.

```css
@layer base, components, utilities;

@layer base {
  :root {
    --color-text: #111;
    --space-2: 0.8rem;
  }
}

@layer components {
  .button {
    color: var(--color-text);
    padding: var(--space-2);
  }
}
```

## Selector Strategy - Element and Attribute Selectors Only

Never use CSS classes. Style solely with element selectors and attribute selectors.
Priority order:

1. **Element selectors** - `button`, `input`, `h2`, `section`, `nav`, custom element tags
2. **Attribute selectors** - `[data-part="header"]`, `[data-state-completed="done"]`, `[aria-hidden="true"]`, `[type="submit"]`

For internal component structure, use `data-part="name"` attributes to identify child elements.
For state-driven styling, use `data-*` boolean or enumerated attributes.

```css
/* ✅ PREFERRED: custom element tag as root scope */
my-component {
  display: block;
}

/* ✅ PREFERRED: element selector for native elements */
my-component button {
  cursor: pointer;
}
my-component h2 {
  font-size: var(--font-size-lg);
}

/* ✅ PREFERRED: data-part for internal structure */
my-component [data-part="header"] {
  padding: var(--space-2);
}
my-component [data-part="input"] {
  border: 1px solid;
}

/* ✅ PREFERRED: data-* attribute for state */
[data-state-completed="done"] {
  opacity: 0.6;
}
[aria-current="page"] {
  font-weight: bold;
}

/* ❌ FORBIDDEN: class selectors */
/* .button { } .card { } .todo-item { } */

/* ❌ FORBIDDEN: id selectors for styling */
/* #submit-btn { background: blue; } */

/* ❌ FORBIDDEN: deep chaining with classes */
/* .card .header .title span { color: red; } */
```

Key advantages of avoiding classes:

- **Zero specificity battles** - only element (0,0,1) and attribute (0,1,0) selectors
- **Semantic alignment** - the HTML structure tells you what each element is
- **No naming debates** - no BEM, SMACSS, ITCSS, or any naming convention needed
- **Simpler selectors** - shallow, scoped, easy to override

### Rules for data-part attributes

- Use `data-part="role"` to identify child elements within a component
- Use semantic HTML elements first, `data-part` second
- Keep part names short and descriptive: `header`, `body`, `input`, `label`, `list`, `item`
- Don't use `data-part` on the custom element itself - use the element tag selector

### Rules for state attributes

- Use `data-*` attributes for state: `data-active`, `data-open`, `data-selected`, `data-disabled`
- Use boolean presence (attribute present = true, absent = false)
- CSS selector: `[data-open]` for presence, `[data-open="false"]` for explicit value

## Naming and conventions

### CSS custom property naming

- Custom properties must start with `--`.
- Use a structured naming model: target → declination → state → property.

```css
.selector {
  --action-button--border: 1px solid #fff;
  --action-button--background-color: rgba(50, 50, 50, 0.8);
  --action-button--hover--border: 1px solid #eee;
  --action-button--hover--background-color: rgba(50, 50, 50, 0.5);
  --action-button--secondary--border: 1px solid #eee;
  --action-button--secondary--hover--border: 1px solid #fff;
}
```

### Data-part naming

Use descriptive short names for `data-part="..."` values.
Keep them consistent across components.

```css
my-component [data-part="header"] {
}
my-component [data-part="body"] {
}
my-component [data-part="footer"] {
}
my-component [data-part="input"] {
}
my-component [data-part="list"] {
}
my-component [data-part="item"] {
}
```

## Units and sizing strategy

- Use relative units by default: `rem`, `em` for typography and spacing.
- Use viewport units for viewport related sizing: `vh`, `vw`, `vmin`, `vmax`.
- Use `ch` for typographic line length.
- Use `ms` for animation durations.
- Use `px` as a last resort, mainly for borders.
- Set the root to `0.625em` to make `rem` math base-10, keep `body` at `1.6rem` (16px) for accessibility.

```css
html {
  font-size: 0.625em;
}
body {
  font-size: 1.6rem;
}

p {
  max-inline-size: 45ch;
}
```

## Property ordering inside selectors

**FUNDAMENTAL: keep this order in every CSS file.**

1. custom properties
2. positioning
3. layout and display (flex, grid)
4. visibility
5. box model (width, padding, border, margin, outline)
6. colors and backgrounds
7. typography
8. transforms and motion
9. behavior and helpers (cursor, appearance)

```css
my-component {
  --my-component-gap: 1rem;

  position: relative;
  z-index: 1;

  display: flex;
  flex-direction: column;
  gap: var(--my-component-gap);

  opacity: 1;
  visibility: visible;

  box-sizing: border-box;
  width: 100%;
  padding: 1rem;
  border: 0.1rem solid;
  border-radius: 0.4rem;
  margin: 0;
  outline: 0;

  color: black;
  background-color: white;

  font-size: 1.6rem;
  font-weight: 400;

  transition: opacity 300ms ease;

  cursor: default;
}
```

## Selector structure and nesting order

When authoring nested rules, keep a consistent inner ordering:

1. base declarations (using the property hierarchy above)
2. pseudo elements (`::before`, `::after`)
3. variants driven by attributes (`[data-active]`, `[aria-hidden]`)
4. pseudo classes (`:hover`, `:focus`)
5. media queries
6. children and combinators

### CSS nesting best practices

- Use native CSS nesting to reduce repetition and improve scoping.
- Omit the `&` parent selector where possible.

```css
my-component {
  color: var(--color-text);

  [data-part="child"] {
    padding: var(--space-2);
  }
  h2 {
    font-size: var(--font-size-lg);
  }
}

my-component button {
  background: var(--color-primary);

  &:hover {
    background: var(--color-primary-hover);
  }
  &::before {
    content: "";
  }
  &[aria-disabled="true"] {
    opacity: 0.5;
  }
}
```

### Custom Element selectors

Always use the custom element tag name as the root selector.
Nest child selectors inside using element or attribute selectors.

```css
my-component {
  display: block;
  padding: var(--space-gutter);

  h2 {
    font-size: var(--font-size-lg);
  }
  [data-part="subtitle"] {
    color: var(--color-muted);
  }
}

/* Nested nesting with state */
my-component [data-part="button"] {
  background: var(--color-primary);

  &:hover {
    background: var(--color-primary-hover);
  }
  &[data-active] {
    background: var(--color-primary-active);
  }
}
```

### Tokenize all values

- Convert all literal values to CSS custom properties.

```css
/* PREFERRED: all values are tokens */
my-component {
  padding: var(--space-gutter);
  gap: var(--gap-sm);
  font-size: var(--font-size-base);
  border-radius: var(--radius-default);
}

/* AVOID: hard-coded values */
my-component {
  padding: 1.5rem;
  gap: 1rem;
  font-size: 0.875rem;
  border-radius: 6px;
}
```

Full tokenized example:

```css
:root {
  --border-radius: 5px;
}

my-component {
  --my-component-gap: 1rem;

  position: absolute;
  inset: 0;
  z-index: 1;

  display: flex;
  place-content: center;
  place-items: center;
  gap: var(--my-component-gap);

  opacity: 1;
  visibility: visible;

  box-sizing: border-box;
  width: 10rem;
  padding: 1rem;
  border: 0.1rem solid;
  margin: 1rem;
  outline: 0.3rem solid black;
  outline-offset: 0.3rem;

  color: white;
  background-color: black;

  font-size: 1.6rem;
  font-weight: 700;

  transition: opacity 300ms ease;

  cursor: pointer;

  &::after {
  }
  &[data-error] {
    color: red;
  }
  &[aria-hidden="true"] {
    display: none;
  }
  &:hover {
  }
  @media (width >= 1024px) {
  }
  span {
  }
}
```

## Cascade and specificity rules

- The cascade is a core tool, understand it instead of fighting it.
- Keep selectors shallow, avoid deep chains.
- Remember browsers match selectors from right to left.
- Avoid inline styles, they are hard to override and often force `!important`.

## Formatting rules

- Use 2-space indentation.
- If multiple selectors share the same block, put one selector per line.
- Prefer shorthand properties when it improves maintenance.

## Dependency strategy

- Prefer pure HTML and CSS first. Reach for JS mainly for triggers and side effects, not for styling.
- Avoid third party CSS dependencies by default.
- If you must override third party styles, keep overrides in a separate file.

## HTML choices that improve CSS

- Keep HTML semantic, use CSS for styling.
- Keep CSS ordering aligned with markup order.
- Avoid ids inside reusable components.

## Documentation - CSS Comments (MANDATORY)

> **Every CSS file MUST have clear, meaningful comments.** No exceptions.
> This is enforced by rule guardrails (`pix_check` includes `css-comments-required`).

### Rules

1. **Every CSS file** MUST start with a file-level comment describing its purpose, scope, and what component/page it styles.
2. **Every section** (logical group of rules) MUST have a section comment header.
3. **Every non-obvious rule** (workaround, specificity trick, browser hack, magic number) MUST have an inline comment explaining why.
4. **Every custom property** SHOULD have a comment describing its usage.

### File-level Comment

Every CSS file starts with:

```css
/**
 * FILE: _TodoItem.css
 * USAGE: Styles for the TodoItem component.
 * SCOPE: article[data-part="item"] and its children.
 */
```

### Section Comments

Use clear section headers to group related rules:

```css
/* ─── Layout ─── */

[data-part="card"] {
  display: flex;
  flex-direction: column;
}

/* ─── States ─── */

[data-part="card"][data-open] { ... }
[data-part="card"][data-disabled] { ... }
```

### Inline Comments for Non-obvious Rules

```css
[data-part="item"] {
  scroll-margin-top: 2rem; /* so focus scroll doesn't hide behind sticky header */
  transform: translateZ(0); /* force GPU layer for smooth scroll */
}
```

### Token Comments

```css
:root {
  --color-accent: #4a90d9; /* primary action color, meets WCAG AA on white */
  --space-sm: 0.4rem; /* tight spacing for compact layouts */
}
```

### Enforcement

- The `pix_check` tool validates CSS file comments.
- Run `pix_<skill> mode=check` to verify documentation compliance.
- **CI MUST fail** if any CSS file lacks required comments.

## Quality gates and maintenance

- Lint for consistency (Stylelint or equivalent).
- Minify before shipping.
- Remove unused CSS when possible.
- **Documentation is NOT optional.** Every CSS file needs clear comments.

## Box model and layout fundamentals

- Use `border-box` globally.

```css
*,
*::after,
*::before {
  box-sizing: border-box;
}
```

- Let the parent handle layout concerns. Components should avoid embedding margin and positional layout unless the component is meant to be layout-aware.

## Responsive and fluid design

- Design for fluidity by default.
- Let content drive sizing. Prefer padding plus max sizes over hard coded width and height.
- Place media queries as selector variations after base rules.

## Color rules

- Define variables for every palette color.
- Use numeric weights for palette steps: lower is brighter, higher is darker (`--color-primary-400` vs `--color-primary-800`).

## Typography rules

- Treat typography as a first class system.
- Use `@font-face` at the top if needed.
- Use CSS to transform casing rather than hardcoding it in HTML (helps i18n).

## Media rules

- Use `<figure>` for composed images and shapes.
- Prefer responsive media handled by HTML when possible.

## Motion and performance

- Prefer animating properties that avoid layout recalculation.
- Minimize layout-modifying animations (width, height, top, left).
- Use `will-change` only as a last resort after measuring a real issue.
- When using transitions, list the properties you actually transition. Avoid `transition: all`.

## Accessibility rules

- Do not remove focus outlines. Style them instead.
- Disable `pointer-events` only when necessary.
- See [`a11y.md`][rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md) for the full accessibility guide.

## Tooling and scaling options

- A preprocessor can help modularity but is optional.
- A design system helps define tokens and global rules.
- A postprocessor can help with prefixing, minification, and policy enforcement.

---

## See also

- [rule-styleguide](../rule-styleguide/SKILL.md) - Style guides index
- [rule](../rule/SKILL.md) - Central skill index
