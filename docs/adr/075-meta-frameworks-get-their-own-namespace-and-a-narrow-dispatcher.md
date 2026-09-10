# 075: Meta-frameworks get their own namespace and a narrow dispatcher

- **Date**: 2026-09-09
- **Status**: accepted
- **Tags**: skills, taxonomy, routing, tools
- **Author**: Emiliano Pisu <pisuemiliano.1980@gmail.com>

## Context

The four meta-framework skills were named rule-frontend-meta-astro, next, nuxt and remix, which put them inside the frontend area where they compete with eleven component skills for the same routing prompts. A meta-framework is not a component library: it owns rendering, routing and data loading, and the component skill still applies under it. The user asked for the rule-meta-* namespace and a hub dispatcher. The name was occupied: the rule-area-meta prompt was the dispatcher and action toolset area, shown as rule-meta in the census.

## Decision

Rename the four skills to rule-meta-astro, next, nuxt and remix, rename the occupying prompt to rule-area-toolset (which is what it always described), and add skills/rule-meta as a hub with a code-registered rule_tool_meta beside it. The dispatcher is deliberately narrow: it matches a named framework first and a framework-owned concept second (islands for Astro, server actions for Next, Nitro for Nuxt, loaders for Remix), and refuses rather than guessing. The router's own corpus and thresholds are measured over the whole skill set, so a second general router would mean re-measuring all of it for no gain. Like rule, the hub registers no per-skill tool and is not BM25-indexed: a dispatcher's own directory dilutes the document frequency of every common term.

## Consequences

Routing a meta-framework request now names one skill and the component skill to load with it. The connect cost went up, not down: the four entries were renamed rather than merged, so the surface is 106 tools and 97,204 tools-list bytes against 105 and 96,679 before, +525 bytes for the dispatcher. The plan expected the rename to stop four near-identical entries being paid for on connect; that would need the four to become modes of one tool, which is a separate decision and a wider change. What this buys is a legible namespace and a dispatcher that answers without consulting ninety skills. ADR 001 and 008 keep the rule-frontend-meta names as history.

## What would end this

The assumption this leans on, and the observation that would make it wrong.
