---
name: rule-frontend
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

# rule-frontend - Frontend Framework Skills Index

## UI Frameworks

| Skill                                                                      | Framework                 | Reactive Model        | State Mgmt          |
| -------------------------------------------------------------------------- | ------------------------- | --------------------- | ------------------- |
| [rule-frontend-react](../rule-frontend-react/SKILL.md)                       | React 18+                 | useState/hooks        | Context + hooks     |
| [rule-frontend-vue](../rule-frontend-vue/SKILL.md)                           | Vue 3                     | ref()/reactive        | Pinia               |
| [rule-frontend-angular](../rule-frontend-angular/SKILL.md)                   | Angular 16+ (standalone)  | signal()              | Signals             |
| [rule-frontend-svelte](../rule-frontend-svelte/SKILL.md)                     | Svelte 5                  | $state (runes)        | Runes               |
| [rule-frontend-solidjs](../rule-frontend-solidjs/SKILL.md)                   | SolidJS                   | createSignal          | Signals             |
| [rule-frontend-astro](../rule-frontend-astro/SKILL.md)                       | Astro (islands)           | Per-framework         | Per-framework       |
| [rule-frontend-vanilla-reactive](../rule-frontend-vanilla-reactive/SKILL.md) | Vanilla JS                | Proxy Store + Signals | Store               |
| [rule-frontend-custom-element](../rule-frontend-custom-element/SKILL.md)     | Vanilla JS (no framework) | componentDecorator    | adopedStyleSheets   |
| [rule-frontend-template-engine](../rule-frontend-template-engine/SKILL.md)   | Vanilla JS (no framework) | TemplateEngine        | SSG/SSR/static-html |

## Meta-Frameworks

| Skill                                                          | Based On        | Features                                   |
| -------------------------------------------------------------- | --------------- | ------------------------------------------ |
| [rule-frontend-meta-next](../rule-frontend-meta-next/SKILL.md)   | Next.js (React) | App Router, SSR/SSG/ISR, server components |
| [rule-frontend-meta-nuxt](../rule-frontend-meta-nuxt/SKILL.md)   | Nuxt 3 (Vue)    | File-based routing, SSR/SSG, auto-imports  |
| [rule-frontend-meta-remix](../rule-frontend-meta-remix/SKILL.md) | Remix (React)   | Nested routing, loaders/actions, SSR       |

## Quick Selection Guide

```
Need SPA with React?                    → rule-frontend-react
Need SPA with Vue?                      → rule-frontend-vue
Need enterprise Angular?                → rule-frontend-angular
Need lightweight Svelte?                → rule-frontend-svelte
Need fine-grained reactivity?           → rule-frontend-solidjs
Need static + islands?                  → rule-frontend-astro
Need pure vanilla (no framework)?       → rule-frontend-vanilla-reactive
Need a zero-dep custom element?         → rule-frontend-custom-element
Need static HTML / SSG / SSR?           → rule-frontend-template-engine
Need full-stack React (Next.js)?        → rule-frontend-meta-next
Need full-stack Vue (Nuxt)?             → rule-frontend-meta-nuxt
Need nested routing (Remix)?            → rule-frontend-meta-remix
```

## See also

- [rule-toolchain-vite](../rule-toolchain-vite/SKILL.md) - Vite build tool
- [rule-styleguide-a11y](../rule-styleguide-a11y/SKILL.md) - Accessibility
- [rule](../rule/SKILL.md) - Central skill index
