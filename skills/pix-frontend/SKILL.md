---
name: pix-frontend
description: >-
  Use when building frontend UIs to route to the correct framework skill. Covers React, Vue, Angular, Svelte, SolidJS, Astro, and meta-frameworks.
tags:
  - "frontend"
  - "ui"
  - "react"
  - "vue"
  - "angular"
  - "svelte"
  - "solidjs"
  - "astro"
  - "index"
frameworks: [all]
---

# pix-frontend - Frontend Framework Skills Index

## UI Frameworks

| Skill                                                          | Framework                | Reactive Model | State Mgmt      |
| -------------------------------------------------------------- | ------------------------ | -------------- | --------------- |
| [pix-frontend-react](../pix-frontend-react/SKILL.md)           | React 18+                | useState/hooks | Context + hooks |
| [pix-frontend-vue](../pix-frontend-vue/SKILL.md)               | Vue 3                    | ref()/reactive | Pinia           |
| [pix-frontend-angular](../pix-frontend-angular/SKILL.md)       | Angular 16+ (standalone) | signal()       | Signals         |
| [pix-frontend-svelte](../pix-frontend-svelte/SKILL.md)         | Svelte 5                 | $state (runes) | Runes           |
| [pix-frontend-solidjs](../pix-frontend-solidjs/SKILL.md)       | SolidJS                  | createSignal   | Signals         |
| [pix-meta-astro](../pix-meta-astro/SKILL.md) | Astro (islands)          | Per-framework  | Per-framework   |

## Rules that hold whichever framework you route to

- Zero CSS classes, zero inline styles, semantic HTML, external CSS.
- **Flex first** - a layout is `display: flex` unless it needs one of the four
  things flex cannot express: named template areas, subgrid, explicit item
  placement or overlap, or auto-fit/auto-fill tracks. Anything a flex row or
  column can do, flex does; a grid that is genuinely one of the four says which
  in a `/* grid: why */` comment. `pix_tool_check` enforces it (`css-flex-first`),
  and `pix-styleguide-css` has the conversions.

## Cross-Cutting

| Skill                                                    | Framework | Covers                                                                                 |
| -------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------- |
| [pix-frontend-workers](../pix-frontend-workers/SKILL.md) | all       | Web Workers, worker pools, transferables, OffscreenCanvas, `scheduler.yield`, INP/LoAF |

## Meta-Frameworks

| Skill                                                          | Based On        | Features                                   |
| -------------------------------------------------------------- | --------------- | ------------------------------------------ |
| [pix-meta-next](../pix-meta-next/SKILL.md)   | Next.js (React) | App Router, SSR/SSG/ISR, server components |
| [pix-meta-nuxt](../pix-meta-nuxt/SKILL.md)   | Nuxt 3 (Vue)    | File-based routing, SSR/SSG, auto-imports  |
| [pix-meta-remix](../pix-meta-remix/SKILL.md) | Remix (React)   | Nested routing, loaders/actions, SSR       |

## When the framework is the over-engineering

A component framework earns its cost on interactive state that lives in the
client. For a page whose interactions are load, filter, submit and reload a
region, most of the complexity is not solving user problems: it is solving
framework problems. State synchronization, cache invalidation, component
lifecycle edges. None of them appear in a bug report a user would file.

The honest test, before starting a project on a framework:

| Question                                                                               | If the answer is no                           |
| -------------------------------------------------------------------------------------- | --------------------------------------------- |
| Does state need to live in the client, across several components, between navigations? | The server already holds it and can render it |
| Do interactions need to be optimistic, offline, or real-time?                          | A request and a fresh fragment is enough      |
| Is there client-side logic no server round trip could give you?                        | The round trip is simpler and it is not slow  |

Where all three are no, server-rendered HTML with attribute-driven requests that
swap a fragment does the same job in a fraction of the code, and it deletes
whole categories of decision rather than making them easier. The trade is real
in both directions: it also removes flexibility. Real-time collaboration gets
harder, and a genuinely interactive surface will want the framework back.

Two things worth saying out loud when this comes up:

- **Measure the thing users notice.** A round trip that adds tens of
  milliseconds to a table load is not perceptible, and a bundle that fails to
  build is. Compare on regressions and on the time it takes to make a small
  change, not on a score.
- **Architecture decisions age, sometimes quickly.** Choosing the smaller thing
  is not a promise never to need the larger one, and choosing the larger one in
  advance is not insurance, it is the cost paid early.

The mixed answer is usually the correct one: server-rendered pages by default,
with a component island where the interaction genuinely justifies one. See
[pix-meta-astro](../pix-meta-astro/SKILL.md) for that shape as a
default. Where a small amount of client state does not need a framework at
all, plain custom elements and a stylesheet are the whole answer:
[pix-styleguide-javascript](../pix-styleguide-javascript/SKILL.md) and
[pix-styleguide-css](../pix-styleguide-css/SKILL.md) carry those
conventions.

## Quick Selection Guide

```
Need SPA with React?                    → pix-frontend-react
Need SPA with Vue?                      → pix-frontend-vue
Need enterprise Angular?                → pix-frontend-angular
Need lightweight Svelte?                → pix-frontend-svelte
Need fine-grained reactivity?           → pix-frontend-solidjs
Need static + islands?                  → pix-meta-astro
Need pure vanilla (no framework)?       → pix-styleguide-javascript
UI freezes on heavy JS?                 → pix-frontend-workers
Need full-stack React (Next.js)?        → pix-meta-next
Need full-stack Vue (Nuxt)?             → pix-meta-nuxt
Need nested routing (Remix)?            → pix-meta-remix
```

## See also

- [pix-toolchain-vite](../pix-toolchain-vite/SKILL.md) - Vite build tool
- [pix-styleguide-a11y](../pix-styleguide-a11y/SKILL.md) - Accessibility
- [pix](../pix/SKILL.md) - Central skill index
