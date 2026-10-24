# 005: Zero-CSS-class design system with CSS custom-property tokens and adoptedStyleSheets

- **Date**: 2026-07-11
- **Status**: accepted
- **Tags**: frontend, design-system, css, accessibility
- **Author**: rule-mcp-architect

## Context

rule-mcp-ui-design-system and rule-mcp-styleguide-css mandate zero CSS classes, zero inline styles, and semantic HTML with `[data-part]`/`[data-*]` selectors, plus a proportional, tokenized design system (typography, spacing, radii, elevation, motion) and WCAG 2.2 AA compliance. The brief also asked for an "Apple-grade" UI with microinteractions.

## Decision

All component styling lives in external `_Component.css` files, loaded via `import cssText from "./_Component.css?raw"` and adopted once per unique stylesheet through a shared `useAdoptedStylesheet` hook backed by `document.adoptedStyleSheets` (deduplicated via a module-level `Map`). Every selector is an element tag or a `[data-part="..."]`/`[data-*]` attribute, no `className` is used anywhere in the codebase. A single `tokens.css` defines the full scale: a 1.25 modular type scale, a geometric 0.4rem-based spacing scale, 5-step radii, 5-step elevation (soft layered shadows, never a hard drop-shadow), two motion durations plus one spring-flavored easing, and an OKLCH neutral+accent palette with an explicit `prefers-color-scheme: dark` override block. All interactive elements keep `:focus-visible` styling (never `outline: none` without replacement) and every animation respects `prefers-reduced-motion`.

## Consequences

Positive: fully compliant with the mandated guardrails, verified automatically by 8 Playwright+axe-core tests (zero violations) covering landmarks, headings, labels and color contrast. Styling is easy to reason about (no specificity wars, no utility soup) and every visual value is tokenized so changing the whole system means editing `tokens.css` only. Negative: the accent color had to be split into three shades (`-500` border/focus, `-600` solid-fill/text, `-700` hover) purely to satisfy 4.5:1 contrast on white, pure OKLCH palettes need this kind of manual contrast pass, it is not automatic. The `?raw` + adoptedStyleSheets pattern requires a `CSSStyleSheet.replaceSync` polyfill in the Vitest/jsdom environment (added to `setupTests.ts`).

## Alternatives Considered

1. Tailwind CSS or a component library (rejected: explicitly forbidden by rule-mcp-styleguide-css/rule-mcp-ui-design-system)
1. CSS Modules with generated class names (rejected: still classes, and the skill requires adoptedStyleSheets/external CSS with element+data-part selectors)
1. Inline styles / styled-components (rejected: zero-inline-styles is a hard guardrail)
