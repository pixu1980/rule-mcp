---
name: pix-process-feature-workflow
description: >-
  Use when adding a new feature from branch creation through merge request. Covers the complete end-to-end feature implementation process.
tags:
  - "process"
  - "feature"
  - "workflow"
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: pix-engineering
  version: "1.0"
---

# Feature Workflow

The workflow must follow a standard Git flow.

## Step 1 — Create a feature branch

```bash
git checkout develop
git pull origin develop
git checkout -b feat/<feature-name>
```

Follow branch naming rules from **commits-branches** rule.

## Step 2 — Plan the implementation

Before writing code, identify:

- Which files need to be created or modified.
- Which types/interfaces are needed.
- Which tests are needed (unit and integration).
- Whether new dependencies are required and justified according to project constraints.

## Step 3 — Write types first

Define TypeScript interfaces and types in `src/types/`. Use strict typing, for example:

```ts
export interface CreateOrderInput {
  readonly userId: string;
  readonly items: readonly OrderItem[];
  readonly currency: 'EUR' | 'USD';
}

export interface Order {
  readonly id: string;
  readonly userId: string;
  readonly items: readonly OrderItem[];
  readonly total: number;
  readonly currency: 'EUR' | 'USD';
  readonly createdAt: Date;
}
```

## Step 4 — Write tests before or alongside implementation

- Create test files in `tests/unit/` and `tests/integration/` mirroring the source structure
- Write at least: one happy-path test, one error-case test, one edge-case test per public function
- See **testing-standards** skill for patterns

## Step 5 — Implement the feature

- Place business logic in `src/services/`
- Place data access in `src/repositories/`
- Place route handlers in `src/routes/` (backend) or page components in `src/pages/` (frontend)

## Step 6 — Validate

Run in order:

```bash
pnpm lint
pnpm test
pnpm test:coverage
pnpm build
```

Or use `pnpm`.

All must pass. Coverage must meet thresholds from **testing-standards** rule.

## Step 7 — Commit

Use Conventional Commits format.

## Step 8 — Push and create merge request

Push and create a merge request targeting `develop`. Ensure CI pipeline passes.

## Checklist

- [ ] Types defined with strict typing
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Coverage thresholds met
- [ ] Lint passes with no errors
- [ ] Build succeeds
- [ ] Commit message follows Conventional Commits
- [ ] No forbidden dependencies added
- [ ] README updated if the feature changes public API or setup steps

## Edge cases

- **Hotfixes**: Branch from `main` instead of `develop` using `hotfix/<name>`. Merge back to both `main` and `develop`.
- **Breaking changes**: Add `!` after the type in the commit message and include a `BREAKING CHANGE:` footer. Update the README and documentation.
- **Cross-package changes in monorepos**: Validate all affected packages individually with `pnpm --filter <pkg> test:coverage`.

---

## See also

- [pix](../pix/SKILL.md) — Central skill index and dispatcher
- [pix-architect](../pix-architect/SKILL.md) — Project architecture wizard
