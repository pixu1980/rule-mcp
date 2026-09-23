# ADR 002: UI Design System Tokens

## Status
Accepted

## Context
The bookmarks manager needs a consistent design system: proportional typography,
spacing, radii, elevations, and color tokens. Apple-grade UI with microinteractions.
Must follow rule-mcp rules: zero CSS classes, zero inline styles, semantic HTML,
external CSS via CSSStyleSheet/adoptedStyleSheets.

## Decision
- **CSS custom properties** scoped via `:root` in design system CSS file
- **Typography**: `chivo` (display) + `inter` (body) — self-hosted via Google Fonts
  - Scale: 0.75 / 0.875 / 1 / 1.125 / 1.25 / 1.5 / 2 / 2.5 / 3 (rem)
  - Leading: 1.0 / 1.15 / 1.3 / 1.5 / 1.75
  - Measure: 60-75ch for body text
- **Spacing**: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 / 96 (px → rem)
- **Radii**: 4 / 6 / 8 / 12 / 16 / 24 (px → rem)
- **Elevation**: 5-level shadow system (0-4) using layered box-shadows
- **Color**: Dark theme optimized for focus/readability
  - Surface: oklch color space
  - Accent: warm gold/amber (#E8B84B)
  - Focus: high-contrast ring
- **Motion**: CSS transitions 200-400ms, cubic-bezier(.2,.8,.2,1), respects prefers-reduced-motion
- **No CSS classes, no inline styles, no Tailwind** — element + `[data-part]` selectors only

## Consequences
- Consistent visual language across all components
- Easy to theme by overriding custom properties
- Self-documenting design tokens
- Dark mode only for MVP (light mode easy to add later)
