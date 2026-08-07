---
name: rule-process-code-review
description: >-
  Use when preparing, conducting, or improving a pull or merge request review. Covers review readiness, risk-based review, constructive feedback, approval gates, and follow-up ownership.
tags:
  - process
  - code-review
  - pull-request
  - quality
  - collaboration
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# Code Review Workflow

Code review protects the product and shares context; it is not a substitute
for automated checks or a venue for stylistic preference without consequence.
Review the smallest meaningful change and prioritize correctness, safety, and
operability over formatting that tooling can enforce.

## 1. Prepare a reviewable change

Before requesting review, the author must:

- Keep the change single-purpose and split unrelated refactors or formatting.
- State the problem, intended outcome, non-goals, risks, and notable
  trade-offs.
- Link the issue, ADR, design, or API contract when applicable.
- Provide reproducible verification steps and report commands actually run.
- Ensure CI, lint, tests, type checks, and build gates are green.
- Call out migrations, feature flags, rollout/rollback plans, user-visible
  changes, and follow-up work.

Prefer a sequence of small reviews over one large opaque diff. If a large
change is unavoidable, provide a review order and isolate mechanical changes.

## 2. Review by risk, not line order

Start with the change intent and system boundaries, then inspect the paths
with the highest cost of failure:

1. Authorization, privacy, secret handling, external input, and destructive
   operations.
2. Domain invariants, data migrations, concurrency, retries, and failure
   recovery.
3. Public contracts: API, schema, event, CLI, configuration, and compatibility.
4. Performance-sensitive paths, observability, deployment, and rollback.
5. Tests: meaningful behavior, boundary cases, and a regression test for a
   defect.
6. Readability, naming, duplication, and maintainability.

Run or inspect the relevant checks when practical. Do not approve a change
solely because its diff appears reasonable.

## 3. Write actionable feedback

Every blocking comment should state the location, observed risk, and expected
outcome or concrete fix. Mark severity clearly:

- **blocking** - correctness, security, data loss, compatibility, or required
  policy violation.
- **non-blocking** - improvement that does not prevent safe merge.
- **question** - seek context before assuming a defect.

Discuss the code, not the author. Avoid vague comments such as “this feels
wrong”; explain the failure mode. Resolve threads only after the concern is
addressed or explicitly accepted with an owner and follow-up.

## 4. Approve and close the loop

Approve only when the change meets its stated acceptance criteria and required
gates. Ensure the merge strategy preserves the repository's history policy.
After merge, verify deployment or release signals when the change affects a
running system. Record major design choices as ADRs and schedule debt or
follow-up items instead of leaving ambiguous TODOs.

## Checklist

- [ ] Scope, intent, non-goals, risks, and verification steps are clear.
- [ ] Automated quality gates have passed and results are evidenced.
- [ ] Security, data, compatibility, performance, and operational risks were
      reviewed where relevant.
- [ ] Tests cover behavior and important failure paths, not implementation
      details alone.
- [ ] Feedback is specific, respectful, and severity-labelled.
- [ ] Required changes and accepted follow-ups have an owner.
- [ ] Release, flag, migration, and rollback implications are understood.

## See also

- [rule-process](../rule-process/SKILL.md) - Process skill index
- [rule-process-feature-workflow](../rule-process-feature-workflow/SKILL.md) - Feature delivery flow
- [rule-devops-testing](../rule-devops-testing/SKILL.md) - Tests and coverage gates
- [rule-backend-security](../rule-backend-security/SKILL.md) - Security review concerns
- [rule-process-adr](../rule-process-adr/SKILL.md) - Record durable architecture decisions
