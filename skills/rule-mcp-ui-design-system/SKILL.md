---
name: rule-mcp-ui-design-system
description: >-
  Use when creating production-grade UI components and design systems. Covers component composition, interaction design, accessibility states, external CSS, and design critique of a generated interface one axis at a time.
tags:
  - ui
  - design-system
  - frontend
  - visual-design
  - aesthetics
  - accessibility
frameworks: [all]
---

# rule-mcp-ui-design-system - Distinctive UI design within rule-mcp rules

This skill adapts the creative intent of `frontend-design` to the rule-mcp MCP
skill ecosystem. It is the design-direction layer: it helps agents create
interfaces with a strong visual point of view while remaining compliant with
all rule-mcp implementation styleguides.

Use it when the task asks to design, beautify, restyle, polish, brand, or build
any visible UI surface.

## Non-negotiable rule-mcp constraints

Design ambition never overrides implementation rules:

1. **Zero CSS classes** - use semantic elements plus `[data-part]`, `[data-*]`,
   ARIA states, and element selectors.
2. **Zero inline styles** - no `style="..."`, no JSX `style={{...}}`.
3. **Flex first** - `display: grid` only for named areas, subgrid, explicit placement, or auto-fit tracks; anything a flex row or column can do is flex.
4. **Semantic HTML first** - choose `main`, `section`, `article`, `header`,
   `nav`, `aside`, `form`, `fieldset`, `ul`, `ol`, `li`, `button`, `dialog`,
   and headings before generic containers.
5. **External styling only** - framework-native CSS files or
   `CSSStyleSheet`/`adoptedStyleSheets` for web components.
6. **Accessible by default** - WCAG 2.2 AA, visible focus, keyboard paths,
   labels, reduced-motion fallback, and meaningful text alternatives.
7. **Barrel file tree** - follow `rule-mcp-styleguide-naming` conventions.
8. **No design shortcuts** - no Tailwind, CSS-in-JS, generic utility classes,
   or remote font dependency unless the project explicitly accepts it.

## Design thinking sequence

Before writing UI code, answer these in the implementation notes or PR body:

| Question       | Output                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose        | What problem does this UI solve and for whom?                                                                                                   |
| Tone           | Pick a precise direction: brutalist/raw, editorial, luxury/refined, playful, retro-futuristic, industrial, organic, art-deco, soft/pastel, etc. |
| Differentiator | What is the one unforgettable detail?                                                                                                           |
| Constraints    | Framework, performance, a11y, motion, theme, and deployment constraints.                                                                        |
| Translation    | Which rule-mcp skill and component pattern owns the implementation?                                                                             |

## Aesthetic direction rules

Commit to one memorable direction. Do not blend unrelated trends.

### Typography

- Avoid generic defaults like Arial, Roboto, Inter, or anonymous system stacks
  as the primary expression.
- Prefer self-hosted or project-approved typefaces.
- Pair a characterful display face with a restrained body face.
- If custom fonts are unavailable, choose a deliberate fallback strategy and
  document it.
- Use typographic rhythm: scale, line height, tracking, measure, and hierarchy.

### Color and theme

- Define tokens with CSS custom properties in the external CSS surface.
- Use one dominant palette and one sharp accent instead of evenly distributed
  timid colors.
- Ensure contrast targets meet WCAG 2.2 AA.
- Provide dark/light or high-contrast behavior only when the product requires
  it; avoid theming for its own sake.

### Motion

- Prefer CSS animations and transitions.
- Add high-impact moments: staged entry, state transitions, loading feedback,
  or one memorable hover/focus behavior.
- Respect `prefers-reduced-motion`.
- Do not add motion that hides content, delays interaction, or harms keyboard
  users.

### Spatial composition

- Use deliberate composition: asymmetry, editorial grids, dense control panels,
  refined negative space, diagonal rhythm, overlap, or strict geometric order.
- Keep reading order logical even when the visual layout is expressive.
- Use `data-part` names to encode structure, not appearance.

### Background and texture

- Build atmosphere with CSS gradients, masks, SVG backgrounds, borders, shadow,
  noise assets, or layered transparency - never inline styles.
- Keep decorative effects non-essential and accessible.
- Avoid generic purple gradients on white, stock SaaS cards, and predictable AI
  landing-page layouts.

## Implementation pattern

### Web component / vanilla

```js
import cssText from "./_Showcase.css?raw";

const sheet = new CSSStyleSheet();
sheet.replaceSync(cssText);

export class ShowcasePanel extends HTMLElement {
  connectedCallback() {
    this.attachStyles();
    this.render();
  }

  attachStyles() {
    if (!document.adoptedStyleSheets.includes(sheet)) {
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  }

  render() {
    this.innerHTML = `
      <article data-part="panel" aria-labelledby="showcase-title">
        <header data-part="masthead">
          <p data-part="eyebrow">Design system</p>
          <h2 id="showcase-title">Editorial command surface</h2>
        </header>
        <section data-part="content">
          <p>Distinctive visuals, semantic structure, and accessible states.</p>
        </section>
      </article>
    `;
  }
}
```

```css
article[data-part="panel"] {
  --surface: oklch(18% 0.03 260);
  --ink: oklch(94% 0.02 92);
  --accent: oklch(74% 0.18 54);

  color: var(--ink);
  background:
    radial-gradient(circle at 12% 12%, color-mix(in oklch, var(--accent), transparent 64%), transparent 32rem), linear-gradient(135deg, var(--surface), oklch(10% 0.04 260));
  border: 0.1rem solid color-mix(in oklch, var(--ink), transparent 80%);
}

[data-part="eyebrow"] {
  color: var(--accent);
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

@media (prefers-reduced-motion: no-preference) {
  article[data-part="panel"] {
    animation: panel-enter 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
}
```

### Framework components

For React, Vue, Angular, Svelte, SolidJS, Astro, Next, Nuxt, or Remix:

1. Read this skill for the visual direction.
2. Read the framework skill for implementation constraints.
3. Read `rule-mcp-styleguide` and focused styleguide sub-skills for semantics,
   CSS, a11y, naming, and validation.
4. Generate code using the framework's accepted external CSS mechanism.

## Design critique of a generated interface, one axis per pass

"Review this design and tell me what is wrong" returns a list nobody can act on:
a dozen observations across five axes, none of them ranked, most of them true and
useless. A critique is worth having when it is **one pass per axis, in order,
with the other axes explicitly out of scope.**

Four passes, and the order is the argument:

| Pass                  | Ask for                                                                                                             | Why here                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1. Accessibility      | Contrast, target size, focus order, semantic hierarchy, anything carried by color alone                             | It is the foundation. Fixing it later means redoing the passes that assumed it                      |
| 2. Visual hierarchy   | Whether prominence matches importance, ignoring whether it is attractive                                            | Says what a user sees first, second, third, which is a functional question wearing a visual costume |
| 3. Content            | Labels that are ambiguous, jargon, longer than they need to be, or that fail to state the consequence of the action | Polish, if the context was right. Repair, if it was not                                             |
| 4. Interaction states | Missing hover, focus, loading, empty, error, success, disabled                                                      | Everything above assumed the happy path. This is where generated work is thinnest                   |

Say the exclusion out loud in each pass. "Ignore whether it looks attractive,
evaluate whether the hierarchy reflects the importance of the information and the
actions" gets a usable answer; asking about hierarchy without the exclusion gets
opinions about the color palette.

**Fix one finding at a time, not the list.** Each change is then reviewable
against the thing it was supposed to address, and a later pass cannot quietly
undo an earlier one. A batch fix that repairs the hierarchy and breaks the
contrast is indistinguishable from success at the end.

### Where a generated interface is predictably thin

- **Every state that is not the happy path.** Empty, loading, error, partial,
  offline, too-long, too-many. A generated screen is almost always the screen
  with plausible data in it.
- **Hierarchy that follows visual weight rather than importance.** Everything is
  emphasized, so nothing is, and the primary action sits at the same level as a
  secondary one.
- **Copy that names the mechanism instead of the consequence.** "Submit" and
  "Confirm" where the honest label is what the user will have done.
- **Color doing a job alone.** Status, validity and selection each need a second
  signal that survives grayscale.
- **A design-system component reimplemented locally** because generating one is
  easier than finding the one that exists. Search the system before accepting a
  new component.

### Give the context that removes the critique

Two inputs change what comes back on the first attempt: the design system to work
inside, and a short specification of the information architecture and what the
screen is for. Supplied up front, pass 3 becomes polish. Withheld, it becomes
repair, and passes 1 and 2 are repairing decisions that should never have been
made.

Accessibility findings do not have to stay prose. Run the a11y pass as a
conformance report against the criteria that apply, so what comes back is a list
of criteria with an outcome each, including the ones nothing tested, rather than
a paragraph of impressions.

## Design review checklist

- [ ] A clear aesthetic direction is stated before implementation.
- [ ] The memorable differentiator is visible in typography, motion, layout, or
      atmosphere.
- [ ] No CSS classes or inline styles are used.
- [ ] All selectors are semantic elements, `[data-part]`, `[data-*]`, or states.
- [ ] Every interactive element has accessible name, focus, keyboard behavior,
      and state feedback.
- [ ] Motion respects `prefers-reduced-motion`.
- [ ] Color contrast is WCAG 2.2 AA.
- [ ] File tree follows barrel and naming conventions.
- [ ] The framework-specific skill remains the source of implementation truth.
- [ ] `rule_tool_check` passes before handoff.

## Pair with these skills

| Need              | Skill                                                                |
| ----------------- | -------------------------------------------------------------------- |
| Routing           | [rule-mcp](../rule-mcp/SKILL.md)                                     |
| Frontend umbrella | [rule-mcp-frontend](../rule-mcp-frontend/SKILL.md)                   |
| CSS rules         | [rule-mcp-styleguide-css](../rule-mcp-styleguide-css/SKILL.md)       |
| Semantic HTML     | [rule-mcp-styleguide-html](../rule-mcp-styleguide-html/SKILL.md)     |
| Accessibility     | [rule-mcp-styleguide-a11y](../rule-mcp-styleguide-a11y/SKILL.md)     |
| Naming/file tree  | [rule-mcp-styleguide-naming](../rule-mcp-styleguide-naming/SKILL.md) |
| Validation        | [rule_tool_check](../rule-mcp/SKILL.md) via MCP tool                 |

## See also

- [rule-mcp](../rule-mcp/SKILL.md) - Central skill and tool dispatcher
- [rule-mcp-styleguide](../rule-mcp-styleguide/SKILL.md) - Shared coding standards
- [rule-mcp-frontend](../rule-mcp-frontend/SKILL.md) - Frontend framework index
