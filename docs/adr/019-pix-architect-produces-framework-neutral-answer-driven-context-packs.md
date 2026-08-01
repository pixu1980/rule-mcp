# 019: rule-architect produces framework-neutral, answer-driven context packs

- **Date**: 2026-07-30
- **Status**: accepted
- **Tags**: architect, templates, framework-neutral, detect, generator
- **Author**: rule-architect

## Context

rule-architect turns a wizard interview into a .context/ documentation pack. It was prototyped against one specific vanilla-JS / Custom-Elements / Electron desktop app, and that project's stack leaked into the engine two ways: (1) detectProjectValues fabricated ~27 fixed values (AUTH_MECHANISM, DEPLOY_TARGET, MVP_STEP_*, PERSONA_*, ...) for EVERY project — an empty directory returned all 27; (2) seven templates hardcoded prose stating that stack as fact ("pure vanilla JavaScript only", "Custom Elements v1", Parcel, adoptedStyleSheets, fixed browser versions, dead ../.agents/skills/rule-* links). The result: a React project's generated README asserted "pure vanilla JavaScript only" while its own AGENTS.md said "Frontend: React 18+" — the pack contradicted the user's answers, which undermines trust in the entire output.

## Decision

The generated pack must reflect the user's actual stack, never the prototype's. Two rules: (1) the detector follows DETECT-OR-STAY-SILENT — it emits only values grounded in a real file signal (PROJECT_NAME from package.json/root-doc H1/dir name; package manager from the lockfile present) and never fabricates project-specific content; an empty project now yields just PROJECT_NAME. (2) template prose is ANSWER-DRIVEN — every framework-specific claim is a placeholder filled from wizard answers, reusing the existing P4/P5 normalize + emit machinery. "Framework-neutral" means neutral across FRAMEWORKS (React/Vue/Svelte/vanilla/backend); the rule methodology itself (zero CSS classes, semantic HTML, external CSS, pnpm exact versions, ./src, English) is framework-agnostic and stays as correct defaults. Grounding showed most content was already collected, so only three new single-subfield repeatable fields were added (ARCHITECTURE_PRINCIPLES, TECH_CONSTRAINTS, GUIDANCE_LINKS). Enforced by a CI gate (test/architect-framework-neutral.test.mjs): a neutral React pack must ship no vanilla/Custom-Elements/Parcel/adoptedStyleSheets/IE11/hardcoded-browser literal and no dead skill link.

## Consequences

Positive: packs are correct for any stack with no self-contradiction; the detector never fabricates; a CI gate prevents regression; wired fill-coverage stays 100% (143/143); single-subfield repeatables render as clean bullets that drop when unfilled. Negative: an empty project's prefill is now minimal (just PROJECT_NAME) instead of a rich-but-wrong seed; a few sections render as explicit TODO markers until answered (by design — surfacing missing info beats asserting a default). A milder project-STRUCTURE overfit remains out of scope: several templates still carry ./src/scripts/services/-style layout assumptions in non-gated prose — stack-neutral is done, structure-neutral is a separate follow-up.

## Alternatives Considered

1. Keep the prototype content and let users edit it out — rejected: ships wrong facts by default, and the detector pre-fills wrong values a user may not catch, so low trust.
1. Stack-gated conditional blocks per framework (vanilla prose for vanilla, React prose for React) — rejected: requires a new block-level templating mechanism plus per-stack content to author and maintain; answer-driven placeholders reuse machinery already in place.
1. Add new wizard fields for all genericized content — only partially adopted: grounding showed most content was already collected (BROWSER_SUPPORT, BUILD_COMMAND, FRONTEND_FRAMEWORK, STACK_CSS_APPROACH, STACK_NAME), so only 3 genuinely-uncollected fields were added rather than a large new question set.
