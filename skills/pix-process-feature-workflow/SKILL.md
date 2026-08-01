---
name: rule-process-feature-workflow
description: >-
  Use when adding a new feature from branch creation through merge request. Covers the complete end-to-end feature implementation process.
tags:
  - "process"
  - "feature"
  - "workflow"
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# Feature Workflow

The workflow must follow a standard Git flow.

## Definition of Ready

Do not start implementation until the change has clear acceptance criteria,
known dependencies, identified non-functional requirements, and a named owner
for unresolved risks. Link the business outcome, design, or API contract when
one exists. Split work that cannot be reviewed or released safely as one unit.

## Step 1 — Create a feature branch

```bash
git checkout develop
git pull origin develop
git checkout -b feat/<feature-name>
```

Follow branch and commit rules from [rule-toolchain-husky](../rule-toolchain-husky/SKILL.md).

## Step 2 — Plan the implementation

Before writing code, identify:

- Which files need to be created or modified.
- Which types/interfaces are needed.
- Which tests are needed (unit and integration).
- Whether new dependencies are required and justified according to project constraints.
- Acceptance criteria, security/privacy implications, and measurable
  performance or reliability expectations.
- Whether a feature flag, staged rollout, migration, or rollback plan is
  required to keep `main` safely deployable.

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
- See [rule-devops-testing](../rule-devops-testing/SKILL.md) for patterns

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

All must pass. Coverage must meet thresholds from [rule-devops-testing](../rule-devops-testing/SKILL.md).
For running services, verify the relevant deployment health signal over an
observation window; a green pipeline alone is not a production validation.

## Step 7 — Commit

Use Conventional Commits format. Keep commits atomic: do not combine
unrelated refactors, dependency upgrades, or formatting with the feature.

## Step 8 — Push and create merge request

Push and create a merge request targeting `develop`. Ensure CI pipeline passes.
Provide intent, non-goals, risks, verification evidence, rollout/rollback
notes, and linked decisions so the reviewer can assess the change safely.
Use [rule-process-code-review](../rule-process-code-review/SKILL.md)
for the review workflow.

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
- [ ] Acceptance criteria and non-functional requirements verified
- [ ] Rollout, migration, and rollback implications documented where relevant
- [ ] Review completed using the risk-based code-review workflow

## Edge cases

- **Hotfixes**: Branch from `main` instead of `develop` using `hotfix/<name>`. Merge back to both `main` and `develop`.
- **Breaking changes**: Add `!` after the type in the commit message and include a `BREAKING CHANGE:` footer. Update the README and documentation.
- **Cross-package changes in monorepos**: Validate all affected packages individually with `pnpm --filter <pkg> test:coverage`.

---

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
- [rule-architect](../rule-architect/SKILL.md) — Project architecture wizard
- [rule-process-code-review](../rule-process-code-review/SKILL.md) — Risk-based PR/MR review
- [rule-devops-observability](../rule-devops-observability/SKILL.md) — Production health and rollback verification
