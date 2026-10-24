---
name: rule-mcp-process-code-review
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
  author: rule-mcp-engineering
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

Discuss the code, not the author. Avoid vague comments such as "this feels
wrong"; explain the failure mode. Resolve threads only after the concern is
addressed or explicitly accepted with an owner and follow-up.

## 4. Approve and close the loop

Approve only when the change meets its stated acceptance criteria and required
gates. Ensure the merge strategy preserves the repository's history policy.
After merge, verify deployment or release signals when the change affects a
running system. Record major design choices as ADRs and schedule debt or
follow-up items instead of leaving ambiguous TODOs.

## 5. Reviewing code you did not write

Generated code is cheap to produce and expensive to own, so the question the
review asks has to change. Not "is this clever" and not even "is this correct",
but **can I explain every decision in this diff at three in the morning**. If the
answer is no for any part of it, that part is not reviewed yet.

Count what the change added, and not in lines:

- packages
- abstractions and layers
- configuration and flags
- network calls and services
- build steps

Then five questions, in order, before it merges:

1. **What did it add?** The list above, made explicit.
2. **Why did it add each one?** Any addition the author cannot explain is an
   addition nobody owns.
3. **Could the platform already do this?** The runtime has grown. A retry loop, a
   deadline, a unique ID, a date format, a deep clone: check before installing.
4. **What does this cost in six months?** Upgrades, advisories, debugging,
   onboarding, the reading time of every future maintainer.
5. **Would the same architectural decision have been made without the
   assistant?** If no, stop and review the decision rather than the code.

**The assistant may propose code and dependencies. It does not get to approve
architecture.** That line sounds obvious and is not, because the fast path runs
prompt, generate, run, commit, and never passes through a place where anyone
decided.

### Dependencies, now that adding one is free

Adding a dependency used to cost something: search, read, compare alternatives,
check whether it was maintained, install, learn the API, debug the integration.
That was annoying and it forced a decision. Now the same package arrives in one
sentence. **When the cost of adding something approaches zero, a team needs a new
mechanism for deciding what deserves to exist**, because the old mechanism was
the friction.

For a new package, answer five things before approving: why it is here, what
depends on it, what it executes on install, who maintains it, and what happens
if it is removed.

### Debt arrives as a series of reasonable merges

The dangerous shape is not one bad pull request. It is: refactor this module,
four hundred readable lines, tests pass, merge. Add caching, two hundred and
fifty more, merge. Add retry, another abstraction, merge. Three months later the
author has moved on and nobody can say why two caching layers exist, why a
wrapper wraps a wrapper, or why the code handles an edge case nobody can
reproduce.

Nothing looked catastrophic at the time. That is the point: **complexity
accumulates one successful pull request at a time**, and each one was defensible
on its own.

So the review reads the diff against the request, not only against itself:

- **What was added beyond what was asked?** An unrequested table, flag, layer or
  service is a scope decision wearing an implementation's clothes.
- **Does any new abstraction have exactly one caller?** Then it is a name, not an
  abstraction.
- **What does the test not assert?** A generated test that passes on the first
  run has proved nothing yet.
- **Is there code for a future that has not been asked for?** Delete it; the
  future can add it with better information.

## Checklist

- [ ] Scope, intent, non-goals, risks, and verification steps are clear.
- [ ] Automated quality gates have passed and results are evidenced.
- [ ] Security, data, compatibility, performance, and operational risks were
      reviewed where relevant.
- [ ] Tests cover behavior and important failure paths, not implementation
      details alone.
- [ ] Feedback is specific, respectful, and severity-labeled.
- [ ] Required changes and accepted follow-ups have an owner.
- [ ] Release, flag, migration, and rollback implications are understood.

## See also

- [rule-mcp-process](../rule-mcp-process/SKILL.md) - Process skill index
- [rule-mcp-devops-testing](../rule-mcp-devops-testing/SKILL.md) - Tests and coverage gates
- [rule-mcp-backend-security](../rule-mcp-backend-security/SKILL.md) - Security review concerns
- [rule-mcp-process-adr](../rule-mcp-process-adr/SKILL.md) - Record durable architecture decisions
