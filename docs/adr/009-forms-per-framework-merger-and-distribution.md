# 009 — Forms per Framework — Merger & Distribution

- **Date**: 2026-07-11
- **Status**: accepted
- **Tags**: architecture, forms, frontend, refactoring, solid
- **Author**: rule-architect

## Context

The `rule-frontend-forms` skill was React-specific (`react-hook-form`, `FormProvider`, `useFieldArray`) but sat at the top level as if it applied to all frameworks. This violated two architectural principles:

1. **Single Responsibility Principle (SOLID - S)**: A skill should cover one framework, not masquerade as generic while being framework-specific
2. **Interface Segregation (SOLID - I)**: Each framework should have its own form patterns, not depend on a React-specific interface

Additionally, the skill contained Italian business entity validation (partita IVA, codice fiscale, SDI) which is domain-specific logic, not UI-level form handling — a violation of the **Dependency Inversion Principle**: business rules should not depend on UI frameworks.

## Decision

### 1. Merge React forms into `rule-frontend-react`

All React-specific form content (`react-hook-form`, `zod`, `FormProvider`, `useFieldArray`) moved directly into the React skill where it belongs. The old `rule-frontend-forms` directory is deleted.

### 2. Create form sections for every UI framework

Each framework skill now has a `## Forms` section idiomatic to its ecosystem:

| Framework | Form Library | Validation |
|-----------|-------------|------------|
| React | `react-hook-form` | `zod` + `@hookform/resolvers` |
| Vue 3 | `vee-validate` | `zod` + `@vee-validate/zod` |
| Angular | Reactive Forms (`FormGroup`) | Angular `Validators` + `zod` |
| SolidJS | `@modular-forms/solid` | `zod` + `zodForm` |
| Svelte 5 | `sveltekit-superforms` | `zod` + adapter |
| Astro | Server Actions + islands | `zod` (shared client/server) |
| Vanilla | Store + Signals | `zod` + `safeParse` |

### 3. Italian business validation — preserved but needs relocation

The Italian entity validation (partita IVA, codice fiscale, SDI) is currently orphaned after the forms skill deletion. This domain logic will be relocated to a future `rule-process-compliance` or `rule-platform-italian` skill in a follow-up — it is out of scope for this change.

## Consequences

**Positive:**
- Each framework owns its own form patterns — no accidental React leakage into Vue/Svelte
- SOLID compliance: single responsibility per skill, proper interface segregation
- Vanilla Reactive finally has form patterns congruent with its Store/Signal architecture
- 1 fewer top-level skill (54 total, down from 55)

**Negative:**
- Italian business validation is temporarily orphaned (needs new home)
- Developers must look in each framework skill for form guidance rather than a central "forms" skill
- Cleanup: cross-references in other skills may still point to `rule-frontend-forms`
