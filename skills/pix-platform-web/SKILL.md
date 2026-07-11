---
name: pix-platform-web
description: |
  Web application development with pix principles.
  Covers browser-based app architecture, bundling, routing,
  progressive enhancement, performance budgets, a11y (WCAG 2.2 AA),
  and deployment (static hosting, CDN, CI/CD).
  Delegates framework choice to pix-frontend-react, pix-frontend-vue, pix-frontend-angular, etc.
  Zero CSS classes, semantic HTML, barrel file tree.
tags:
  - "platform"
  - "web"
frameworks: [all]
---

# pix-platform-web — Web Applications with pix Principles

This skill is the **umbrella for all web framework skills** (pix-frontend-react, pix-frontend-vue, pix-frontend-angular, pix-frontend-solidjs, pix-frontend-svelte, pix-frontend-astro, pix-frontend-vanilla-reactive).
Choose one framework skill below the pix-platform-web layer.

## When to use pix-platform-web

- Building a browser-based application (SPA, MPA, or static site)
- Choosing a framework: React, Vue, Angular, SolidJS, Svelte, Astro, or vanilla JS
- Setting up bundling, routing, linting, testing, and deployment
- Applying WCAG 2.2 AA accessibility
- Establishing performance budgets and Core Web Vitals targets

## Core Rules

1. **Zero CSS classes** — only element selectors + `[data-part="..."]` + `[data-*]` attribute selectors
2. **Zero inline styles** — all styling in external `.css` files via `<link>` or `adoptedStyleSheets`
3. **Semantic HTML is mandatory** — never `<div>` where `<section>`, `<article>`, `<nav>`, `<main>`, `<header>`, `<footer>` exists
4. **Barrel pattern** — every component folder has `index.js` re-export, files are `_PascalCase.ext`
5. **No CSS-in-JS, no Tailwind** — external `.css` files only
6. **ES modules** — `import`/`export` everywhere
7. **TypeScript is optional** — JSDoc annotations suffice for type safety
8. **WCAG 2.2 AA** — accessible by default, test with axe-core

## Framework Selection

Choose ONE framework skill below pix-platform-web:

| Framework | Skill | Best for |
|-----------|-------|----------|
| Vanilla JS | [pix-frontend-vanilla-reactive](../pix-frontend-vanilla-reactive/SKILL.md) | Simple apps, widgets, embedded UIs |
| React 18+ | [pix-frontend-react](../pix-frontend-react/SKILL.md) | Complex UIs with rich interactivity |
| Vue 3 | [pix-frontend-vue](../pix-frontend-vue/SKILL.md) | Progressive adoption, balance of power/simplicity |
| Angular 16+ | [pix-frontend-angular](../pix-frontend-angular/SKILL.md) | Large enterprise applications |
| SolidJS | [pix-frontend-solidjs](../pix-frontend-solidjs/SKILL.md) | Fine-grained reactivity, fastest runtime |
| Svelte 5 | [pix-frontend-svelte](../pix-frontend-svelte/SKILL.md) | Minimal boilerplate, smallest bundles |
| Astro | [pix-frontend-astro](../pix-frontend-astro/SKILL.md) | Content-first, islands architecture |

## File Tree Convention

```
project/
├── src/
│   ├── index.html
│   ├── index.js           ← Entry point
│   ├── app.css            ← Global styles
│   ├── components/        ← Reusable UI components
│   │   ├── index.js       ← Barrel
│   │   ├── _Header/
│   │   │   ├── index.js
│   │   │   └── header.css
│   │   └── ...
│   ├── pages/             ← Route-level components (if SPA)
│   ├── lib/               ← Pure business logic
│   ├── store/             ← State management
│   └── __tests__/         ← Unit tests
├── public/                ← Static assets
├── tests/                 ← Integration/E2E tests
└── package.json
```

## Progressive Enhancement & PWA

- **Offline support**: Service worker with cache-first strategy for assets, network-first for data
- **Web App Manifest**: `manifest.json` with `display: standalone`, theme color, icons
- **App shell**: Cache the app shell on first load for instant subsequent opens
- **Lazy registration**: Register service worker after first meaningful paint

## Code Splitting

- **Route-based splitting**: Each top-level route/page is a separate chunk
- **Component-level**: Heavy components (editors, charts, maps) loaded with dynamic `import()`
- **Vendor splitting**: `node_modules` in a separate `vendor.[hash].js` chunk
- **Preload hints**: `<link rel="preload">` for critical fonts/images, `<link rel="modulepreload">` for key modules

## Environment Configuration

```
.env                ← All environments (shared defaults)
.env.local          ← Local overrides (gitignored)
.env.production     ← Production only
.env.development    ← Development only
```

Prefix public variables with `VITE_` (Vite), `NEXT_PUBLIC_` (Next.js), or `PUBLIC_` (Astro).
Never commit secrets — use CI/CD secrets or server-only env.

## Error Handling

- **Error boundaries**: Catch render errors at route/component level, show fallback UI
- **API error handling**: Unified error response shape (`{ ok, data?, error? }`)
- **Global error logging**: Centralized handler for uncaught exceptions and promise rejections
- **User-facing errors**: Toast/snackbar for async failures, inline validation for form errors

## Performance Budgets (Web)

| Metric | Target | Tool |
|--------|--------|------|
| LCP (Largest Contentful Paint) | < 2.5s on slow 3G | Lighthouse CI |
| INP (Interaction to Next Paint) | < 200ms | Web Vitals library |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse CI |
| TBT (Total Blocking Time) | < 200ms | Lighthouse CI |
| Bundle size (initial) | < 150KB gzipped | bundlesize / size-limit |
| Time to Interactive | < 3.5s on slow 3G | Lighthouse CI |

## Security

- **Content Security Policy**: `default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'`
- **HTTP headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
- **Input validation**: Sanitize all user input at the domain boundary
- **Dependencies**: Regular `pnpm audit`, Dependabot for automated updates

## SEO & Social

- **Meta tags**: `<title>`, `<meta name="description">` on every page
- **Open Graph**: `og:title`, `og:description`, `og:image`, `og:url` for social sharing
- **Structured data**: JSON-LD for pages, articles, products, etc.
- **Sitemap**: `sitemap.xml` for search engines
- **Canonical URLs**: Prevent duplicate content issues

## Build & Deploy

```
Tool:    Vite / Parcel / Astro
Test:    Vitest + Playwright
Lint:    ESLint + Prettier
CI:      GitHub Actions — lint → test → build → deploy
Deploy:  Netlify / Vercel / Cloudflare Pages / GitHub Pages
```

## Accessibility (WCAG 2.2 AA)

- All interactive elements reachable via keyboard
- Focus indicators visible (minimum 2:1 contrast ratio against unfocused)
- ARIA landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`
- Alt text on all images
- Color contrast minimum 4.5:1 for normal text, 3:1 for large text
- Form inputs have associated `<label>` elements
- Error messages associated with inputs via `aria-describedby`
- Test with axe-core in CI

## Internationalization (i18n)

- Use browser language detection (`navigator.language`) or user preference
- Store translations as JSON files per locale: `locales/en.json`, `locales/it.json`
- Use ICU MessageFormat for pluralization and interpolation
- Never hardcode user-facing strings — always use translation keys

## Design System / CSS Framework

Choose a design system alongside your UI framework. Options:

| System | Approach |
|--------|----------|
| **Vanilla CSS** | Pure CSS with custom properties, @scope, layers — the pix way |
| **Tailwind CSS** | Utility-first — rapid prototyping, consistent design system |
| **Bootstrap** | Mature component library — responsive grid, prebuilt components |
| **Material Design** | Material Design component library — comprehensive, enterprise |
| **DaisyUI** | Tailwind component library — thematic, customizable, beginner-friendly |
| **Open Props** | Design tokens as CSS custom properties — supercharged variables |

The design system is independent from your UI framework — combine any with any.

## Quick Reference

```
┌────────────────────────────────────────────────────────────┐
│  Framework:  choose one pix-* skill                        │
│  Design:     Vanilla CSS / Tailwind / Bootstrap / MUI /... │
│  Styling:    data-part, zero classes, external CSS          │
│  Semantic:   <header> <nav> <main> <article> <footer>      │
│  Barrel:     index.js re-export per folder                 │
│  PWA:        service worker + manifest.json                │
│  Split:      route-based + vendor chunks                   │
│  Testing:    Vitest (unit) + Playwright (E2E)              │
│  A11y:       WCAG 2.2 AA, axe-core in CI                  │
│  i18n:       JSON locale files, ICU messages               │
│  Perf:       LCP < 2.5s, bundle < 150KB gzipped           │
│  Deploy:     Netlify / Vercel / CF Pages / GitHub Pages    │
│  CI:         GitHub Actions → lint → test → build → deploy │
└────────────────────────────────────────────────────────────┘
```

---


# Scaffolding: Frontend Project Structure

## Project type

Frontend-only single-page application with modern toolchain.
Generated projects must be production-ready, typed, testable, and easy to run in local and CI.

## Generic frontend setup (not React-specific)

- `package.json` with scripts: `dev`, `build`, `preview`, `test`, `test:coverage`, `lint`, `format`
- `tsconfig.json` with strict mode
- `biome.json` for formatting/linting
- `.env.example` for environment variables
- `.gitignore` with OS + Node entries
- `index.html` entry point (for Vite-based projects)
- `public/` directory for static assets

## Test structure

```
tests/
├── unit/
├── integration/
└── setup.ts
```

## Apply standards

- Testing: `pix-devops-testing`
- Docker: `pix-devops-docker`
- Accessibility: `pix-styleguide`
- i18n: `pix-frontend-react`
- Documentation: `pix-process-documentation`

## See also

- [pix](../pix/SKILL.md) — Central skill index and dispatcher
- [pix-toolchain-vite](../pix-toolchain-vite/SKILL.md) — Vite build tool
- [pix-frontend-react](../pix-frontend-react/SKILL.md) — React setup
