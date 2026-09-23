# Orbit design system

Orbit uses a small token layer at the top of `src/components/OrbitApp/_OrbitApp.css`.

- **Typography:** proportional `--step-*` scale, Avenir/SF Pro body, Iowan/Baskerville display face, mono labels.
- **Spacing:** 4px base with `--space-1` through `--space-16`.
- **Shape:** `--radius-sm` for controls, `--radius-md` for cards, `--radius-xl` for dialogs.
- **Elevation:** `--shadow-low` for selected surfaces and `--shadow-float` for dialogs.
- **Focus:** visible 3px `:focus-visible` ring using `--focus`.
- **Color:** ink/paper neutrals, coral accent, semantic green success, and darkened pastel avatar backgrounds that meet WCAG AA.
- **Motion:** staggered contact reveal, panel entrance, dialog scale, hover lift, and reduced-motion fallback.

All styling is external CSS and uses semantic elements plus `data-part`/`data-*` hooks rather than CSS classes.
