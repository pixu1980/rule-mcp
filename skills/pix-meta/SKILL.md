---
name: pix-meta
description: >-
  Use when routing a meta-framework request to the correct pix skill: Astro, Next.js, Nuxt or Remix. Acts as the dispatcher for the meta-framework set, the way pix dispatches the whole ecosystem.
tags:
  - meta
  - meta-framework
  - dispatcher
  - ssr
  - ssg
  - islands
  - routing
frameworks: [astro, next, nuxt, remix]
---

# pix-meta - Meta-framework dispatcher

A meta-framework brings its own router, its own data loading and its own
rendering modes, and every one of them answers the same three questions
differently: where does this component render, when does its data load, and
what ships to the browser. `pix-meta` routes a request to the skill that
answers them for the framework in hand, and `pix_tool_meta` does it by code.

The base framework skill still applies. A Next.js page is React, a Nuxt page
is Vue: the meta skill owns rendering, routing and data loading, the framework
skill owns the component.

## The set

| Skill                                        | Framework | Owns                                                      |
| -------------------------------------------- | --------- | --------------------------------------------------------- |
| [pix-meta-astro](../pix-meta-astro/SKILL.md) | Astro     | Islands, partial hydration, content collections, adapters |
| [pix-meta-next](../pix-meta-next/SKILL.md)   | Next.js   | App Router, server components, server actions, caching    |
| [pix-meta-nuxt](../pix-meta-nuxt/SKILL.md)   | Nuxt      | Nitro, auto-imports, `useAsyncData`, hybrid rendering     |
| [pix-meta-remix](../pix-meta-remix/SKILL.md) | Remix     | Loaders, actions, nested routes, progressive enhancement  |

## Dispatch contract

1. Name the framework. A prompt that names one routes there and stops.
2. No framework named? Route on the concept: islands to Astro, server actions
   to Next, Nitro or auto-imports to Nuxt, loaders and actions to Remix.
3. Add the base framework skill: `pix-frontend-react` for Next and Remix,
   `pix-frontend-vue` for Nuxt, `pix-frontend` plus `pix-styleguide` for Astro.
4. Add `pix-styleguide` for anything that renders markup, always.
5. Deployment target decided? Add `pix-platform-web`, and `pix-devops-docker`
   when it self-hosts.

## Choosing between them

Pick by what the page needs, not by what is popular:

- Mostly static content, a little interactivity: **Astro**. It ships no
  JavaScript until an island asks for it.
- A React application with server-side data and mutations: **Next.js**.
- A Vue application of the same shape: **Nuxt**.
- Progressive enhancement as a hard requirement - forms that work before
  hydration: **Remix**.

None of the four is a reason to reach for a meta-framework at all. A single-page
application with no server-rendered data is `pix-frontend` plus the framework
skill, and it stays simpler.

## MCP tools

| Tool                  | Use when                                                              |
| --------------------- | --------------------------------------------------------------------- |
| `pix_tool_meta`       | The framework is unknown, or the prompt is about rendering in general |
| `pix_tool_meta_astro` | Astro, once named                                                     |
| `pix_tool_meta_next`  | Next.js, once named                                                   |
| `pix_tool_meta_nuxt`  | Nuxt, once named                                                      |
| `pix_tool_meta_remix` | Remix, once named                                                     |
| `pix_tool_detect`     | The repository should say which one it already uses                   |
| `pix_tool_check`      | Before claiming generated code is correct - failures are blocking     |

## See also

- [pix](../pix/SKILL.md) - the dispatcher for the whole ecosystem
- [pix-frontend](../pix-frontend/SKILL.md) - the component layer under every meta-framework
- [pix-platform-web](../pix-platform-web/SKILL.md) - shipping the result
- [pix-styleguide](../pix-styleguide/SKILL.md) - zero CSS classes, semantic HTML, external CSS
