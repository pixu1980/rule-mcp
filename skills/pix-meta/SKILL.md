---
name: rule-meta
description: >-
  Use when routing a meta-framework request to the correct rule skill: Astro, Next.js, Nuxt or Remix. Acts as the dispatcher for the meta-framework set, the way rule dispatches the whole ecosystem.
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

# rule-meta - Meta-framework dispatcher

A meta-framework brings its own router, its own data loading and its own
rendering modes, and every one of them answers the same three questions
differently: where does this component render, when does its data load, and
what ships to the browser. `rule-meta` routes a request to the skill that
answers them for the framework in hand, and `rule_tool_meta` does it by code.

The base framework skill still applies. A Next.js page is React, a Nuxt page
is Vue: the meta skill owns rendering, routing and data loading, the framework
skill owns the component.

## The set

| Skill                                        | Framework | Owns                                                      |
| -------------------------------------------- | --------- | --------------------------------------------------------- |
| [rule-meta-astro](../rule-meta-astro/SKILL.md) | Astro     | Islands, partial hydration, content collections, adapters |
| [rule-meta-next](../rule-meta-next/SKILL.md)   | Next.js   | App Router, server components, server actions, caching    |
| [rule-meta-nuxt](../rule-meta-nuxt/SKILL.md)   | Nuxt      | Nitro, auto-imports, `useAsyncData`, hybrid rendering     |
| [rule-meta-remix](../rule-meta-remix/SKILL.md) | Remix     | Loaders, actions, nested routes, progressive enhancement  |

## Dispatch contract

1. Name the framework. A prompt that names one routes there and stops.
2. No framework named? Route on the concept: islands to Astro, server actions
   to Next, Nitro or auto-imports to Nuxt, loaders and actions to Remix.
3. Add the base framework skill: `rule-frontend-react` for Next and Remix,
   `rule-frontend-vue` for Nuxt, `rule-frontend` plus `rule-styleguide` for Astro.
4. Add `rule-styleguide` for anything that renders markup, always.
5. Deployment target decided? Add `rule-platform-web`, and `rule-devops-docker`
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
application with no server-rendered data is `rule-frontend` plus the framework
skill, and it stays simpler.

## MCP tools

| Tool                  | Use when                                                              |
| --------------------- | --------------------------------------------------------------------- |
| `rule_tool_meta`       | The framework is unknown, or the prompt is about rendering in general |
| `rule_tool_meta_astro` | Astro, once named                                                     |
| `rule_tool_meta_next`  | Next.js, once named                                                   |
| `rule_tool_meta_nuxt`  | Nuxt, once named                                                      |
| `rule_tool_meta_remix` | Remix, once named                                                     |
| `rule_tool_detect`     | The repository should say which one it already uses                   |
| `rule_tool_check`      | Before claiming generated code is correct - failures are blocking     |

## See also

- [rule](../rule/SKILL.md) - the dispatcher for the whole ecosystem
- [rule-frontend](../rule-frontend/SKILL.md) - the component layer under every meta-framework
- [rule-platform-web](../rule-platform-web/SKILL.md) - shipping the result
- [rule-styleguide](../rule-styleguide/SKILL.md) - zero CSS classes, semantic HTML, external CSS
