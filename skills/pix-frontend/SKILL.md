---
name: pix-frontend
description: >-
  Use when building frontend UIs to route to the correct framework skill. Covers React, Vue, Angular, Svelte, SolidJS, Astro, meta-frameworks, and vanilla reactive.
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

| Skill                                                                      | Framework                 | Reactive Model        | State Mgmt          |
| -------------------------------------------------------------------------- | ------------------------- | --------------------- | ------------------- |
| [pix-frontend-react](../pix-frontend-react/SKILL.md)                       | React 18+                 | useState/hooks        | Context + hooks     |
| [pix-frontend-vue](../pix-frontend-vue/SKILL.md)                           | Vue 3                     | ref()/reactive        | Pinia               |
| [pix-frontend-angular](../pix-frontend-angular/SKILL.md)                   | Angular 16+ (standalone)  | signal()              | Signals             |
| [pix-frontend-svelte](../pix-frontend-svelte/SKILL.md)                     | Svelte 5                  | $state (runes)        | Runes               |
| [pix-frontend-solidjs](../pix-frontend-solidjs/SKILL.md)                   | SolidJS                   | createSignal          | Signals             |
| [pix-frontend-astro](../pix-frontend-astro/SKILL.md)                       | Astro (islands)           | Per-framework         | Per-framework       |
| [pix-frontend-vanilla-reactive](../pix-frontend-vanilla-reactive/SKILL.md) | Vanilla JS                | Proxy Store + Signals | Store               |
| [pix-frontend-custom-element](../pix-frontend-custom-element/SKILL.md)     | Vanilla JS (no framework) | componentDecorator    | adopedStyleSheets   |
| [pix-frontend-template-engine](../pix-frontend-template-engine/SKILL.md)   | Vanilla JS (no framework) | TemplateEngine        | SSG/SSR/static-html |

## Meta-Frameworks

| Skill                                                          | Based On        | Features                                   |
| -------------------------------------------------------------- | --------------- | ------------------------------------------ |
| [pix-frontend-meta-next](../pix-frontend-meta-next/SKILL.md)   | Next.js (React) | App Router, SSR/SSG/ISR, server components |
| [pix-frontend-meta-nuxt](../pix-frontend-meta-nuxt/SKILL.md)   | Nuxt 3 (Vue)    | File-based routing, SSR/SSG, auto-imports  |
| [pix-frontend-meta-remix](../pix-frontend-meta-remix/SKILL.md) | Remix (React)   | Nested routing, loaders/actions, SSR       |

## Quick Selection Guide

```
Need SPA with React?                    → pix-frontend-react
Need SPA with Vue?                      → pix-frontend-vue
Need enterprise Angular?                → pix-frontend-angular
Need lightweight Svelte?                → pix-frontend-svelte
Need fine-grained reactivity?           → pix-frontend-solidjs
Need static + islands?                  → pix-frontend-astro
Need pure vanilla (no framework)?       → pix-frontend-vanilla-reactive
Need a zero-dep custom element?         → pix-frontend-custom-element
Need static HTML / SSG / SSR?           → pix-frontend-template-engine
Need full-stack React (Next.js)?        → pix-frontend-meta-next
Need full-stack Vue (Nuxt)?             → pix-frontend-meta-nuxt
Need nested routing (Remix)?            → pix-frontend-meta-remix
```

## See also

- [pix-toolchain-vite](../pix-toolchain-vite/SKILL.md) - Vite build tool
- [pix-styleguide-a11y](../pix-styleguide-a11y/SKILL.md) - Accessibility
- [pix](../pix/SKILL.md) - Central skill index
