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
guardrails: [css-comments-required, css-flex-first, external-css, no-css-classes, no-inline-styles]
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
- Use a structured naming model: target -> declination -> state -> property.

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

## One-liners that replace the workaround: clamp fluid type, aspect ratio, flex centering, auto-fit grid, color-scheme dark mode, line-clamp, sticky

Each of these replaces a pattern that used to need a wrapper, a media query
stack, or JavaScript. They are all baseline in current browsers.

```css
/* Centering, without the translate(-50%, -50%) dance */
display: flex;
align-items: center;
justify-content: center;

/* Fluid type with a floor and a ceiling, instead of three breakpoints */
font-size: clamp(1rem, 2.5vw, 2rem);

/* Reserve the box before the media loads: no layout shift, no padding-top hack */
aspect-ratio: 16 / 9;

/* Responsive columns with no breakpoints at all, and the one grid case a
   wrapping flex row does not cover: identical tracks on every row */
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));

/* Truncate to a line count, ellipsis included */
line-clamp: 3;

/* Anchor scrolling, without window.scrollTo animation code */
scroll-behavior: smooth;

/* Let the UA theme form controls, scrollbars and the canvas for both modes */
color-scheme: light dark;

/* Headings that break into even lines instead of one orphan word */
text-wrap: balance; /* pretty: for body copy */

/* Table headers that stay put while the body scrolls */
th {
  position: sticky;
  top: 0;
}

/* Tint checkboxes, radios, ranges and progress with the brand colour */
accent-color: var(--brand);

/* Stop a scrolling modal from scrolling the page behind it */
overscroll-behavior: contain;
```

Two more worth knowing, for the same reason:

```css
/* Skip rendering work for offscreen sections */
content-visibility: auto;
contain-intrinsic-size: auto 400px; /* so the scrollbar stays honest */

/* Inputs that size to their content */
field-sizing: content;
```

Reach for the property before the wrapper. Most of these exist because the
workaround they replace was common enough to standardize, and every one of them
removes markup, a media query, or a script.

## Documentation - CSS Comments (MANDATORY)

> **Every CSS file MUST have clear, meaningful comments.** No exceptions.
> This is enforced by rule guardrails (`rule_tool_check` includes `css-comments-required`).

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

- The `rule_tool_check` tool validates CSS file comments.
- Run `rule_tool_<skill> mode=check` to verify documentation compliance.
- **CI MUST fail** if any CSS file lacks required comments.

## Quality gates and maintenance

- Lint for consistency (Stylelint or equivalent).
- Minify before shipping.
- Remove unused CSS when possible.
- **Documentation is NOT optional.** Every CSS file needs clear comments.

## Flex first, grid only when it is the only thing that works: the four cases that earn a grid

Flex and grid are not two equal tools to pick between by taste. A flex container
declares one axis and hands the rest to the content: a row, a column, a toolbar,
a stack, a wrapping set of cards. That is what interfaces are made of. A grid
declares a coordinate system, and the tracks have to exist before anything
occupies them - which is power when the layout genuinely has two dimensions, and
maintenance for nothing when it does not. A `grid-template-columns` written for a
label and a button is a second thing to keep in step every time either changes.

**So the rule has no exceptions to weigh: if flex produces the same visual
result, flex is what gets written.** Grid is the second choice, and it is
reached for only when one of these four is true.

```css
/* 1. Named areas: a structure flex cannot name at all. */
[data-part="page"] {
  display: grid;
  grid-template-areas:
    "nav main"
    "nav footer";
  grid-template-columns: 16rem 1fr;
}

/* 2. Subgrid: a child aligning to its parent's tracks. */
[data-part="row"] {
  display: grid;
  grid-template-columns: subgrid;
}

/* 3. Explicit placement or deliberate overlap. */
[data-part="hero"] {
  display: grid;
}
[data-part="hero-media"],
[data-part="hero-caption"] {
  grid-area: 1 / 1;
}

/* 4. auto-fit tracks: columns that appear and disappear with no breakpoint,
      where every row keeps the same track widths. */
[data-part="catalog"] {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
  gap: 1.25rem;
}
```

Everything else is flex, and the conversions are short:

| Reached for grid because                | Flex instead                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `grid-template-columns: 1fr auto`       | `display: flex` + `margin-inline-start: auto` on the item that goes to the end |
| `grid-template-columns: repeat(2, 1fr)` | `display: flex` + `flex: 1 1 0` on the children                                |
| `grid-auto-flow: column`                | `display: flex` (that is what a flex row is)                                   |
| `place-items: center`                   | `display: flex` + `align-items: center` + `justify-content: center`            |
| A wrapping set of cards                 | `display: flex` + `flex-wrap: wrap` + `flex: 1 1 <basis>`                      |
| Spacing between children                | `gap`, which flex has had for years                                            |

```css
/* The row that gets written as a two-column grid, and should not be */
[data-part="field"] {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
[data-part="field-action"] {
  margin-inline-start: auto;
}

/* The wrapping set, without a track definition */
[data-part="card-set"] {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}
[data-part="card"] {
  flex: 1 1 17rem;
}
```

**The one honest difference.** A wrapping flex row lets its last line stretch to
fill: three cards on a row of four leave three wider cards, where auto-fit tracks
would leave three normal cards and a gap. Both are defensible, and the flex
behaviour is the one most designs actually want. When the design requires the
track widths to be identical on every row - a price table read down its columns,
a comparison grid - that is case 4 above, and it is a grid.

**Saying so is part of the rule.** `rule_tool_check` runs `css-flex-first`, which
fails a `display: grid` that shows none of the four signals. A grid that is
legitimate for a reason the stylesheet does not spell out declares it:

```css
/* grid: the tracks have to line up across every row of the ledger */
[data-part="ledger"] {
  display: grid;
}
```

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

## Six layout rules that end the fight with CSS

Most CSS frustration comes from treating the browser as a renderer of one fixed
composition. It is solving a constraint problem: requested sizes against
available space, against minimums and maximums, against what the content itself
needs. These six rules are that solver, described.

**1. Normal flow is the layout system, not the fallback.** A heading takes the
height its text needs, a longer paragraph pushes what follows, a translated
string that wraps to two lines moves its neighbors instead of overlapping them.
That is the strongest responsiveness available, and absolute positioning, fixed
heights and visual transforms opt out of it. Leave content in flow unless it
genuinely needs its own layer: tooltips, badges, dropdowns, backdrops. Headings,
descriptions, form fields and card actions should keep influencing the size of
what contains them. **First debugging question: should this have left flow at
all?**

**2. The parent usually made the decision.** A flex container picks the axis,
distributes free space and decides wrapping - and it is the default, per
flex-first. A grid container defines tracks before anything occupies them, which
is why it is the exception rather than the other half of a choice. A containing block decides what a percentage is a
percentage of. So a child can be doing exactly what it was told while the parent
solves a different problem: `inline-size: 100%` is correct and still narrow
inside a constrained ancestor. **Inspect outward before editing the child**, and
keep going until you find the element that owns the space. A child needing a
negative margin or an odd percentage to look right is usually counteracting a
parent nobody fixed.

**3. Width is a negotiation, not a command.** A flex item asking for `300px` can
still shrink. A grid item fills its track whatever it asks for. An image brings
an intrinsic contribution. Think in ranges: `min()`, `max()`, `clamp()`,
`min-content`, `max-content`, `fit-content` are how the boundaries of the
negotiation get expressed, not advanced features.

```css
main {
  inline-size: min(100% - 2rem, 72rem);
  margin-inline: auto;
}

[data-part="card-grid"] {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}

[data-part="card"] {
  flex: 1 1 17rem;
}
```

Neither rule describes a screenshot. The first says use the width available and
stop before the line length gets uncomfortable; the second says each card needs a
useful minimum, share what is left, and wrap when the container narrows. The last
line stretches to fill; if the tracks have to be identical on every row instead,
that is the auto-fit case and it is a grid.

**4. Content arrives with a size.** Text, images, tables and form controls are not
empty boxes waiting for dimensions. A long unbroken token has a minimum width
that will win. A flex item's automatic minimum size is its content, which is why
it refuses to shrink until `min-inline-size: 0` says otherwise.

**5. Overflow is a symptom, not a problem.** Something is larger than the space
meant to hold it, and the useful question is why: a fixed-width child in a fluid
parent, a token that cannot wrap, a `100vw` section that includes the scrollbar,
an absolutely positioned decoration extending the scroll area, a flex child that
will not shrink. **Hiding overflow on a distant ancestor turns a local sizing
mistake into a global clipping policy**, and it clips focus outlines with it, so
a keyboard user can reach something they cannot see. Some overflow is
legitimate: an editor scrolls, a wide table scrolls in its own container. That
overflow belongs to the component, deliberately.

**6. Components experience containers, not devices.** A card is narrow beside a
sidebar on a large screen and wide on a small one. Breakpoints named after device
categories encode an assumption about where a component will be placed. Prefer
intrinsic layouts first, grid adding and removing columns by the minimum each
item needs, and reach for a container query when a component genuinely has to
restructure on its own width. **Breakpoints come from where the design stops
working**, found by narrowing until it does, not from a list of popular screen
sizes. Viewport queries keep their place for page-level structure and for
environmental preferences.

## Responsive and fluid design: breakpoints from content, not from device names

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
