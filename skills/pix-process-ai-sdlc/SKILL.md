---
name: rule-process-ai-sdlc
description: >-
  Use when planning how AI fits the delivery lifecycle rather than a single task. Covers the artifact chain from intent to incident, plan before code, feedback loops that verify their own work, hooks as approval gates, bidirectional review, and control-band maintenance.
tags:
  - sdlc
  - lifecycle
  - planning
  - intent
  - spec
  - plan-mode
  - review
  - gates
  - governance
  - ai
frameworks: [all]
---

# rule-process-ai-sdlc - When code stops being the bottleneck

## Purpose

The delivery process most teams run was shaped by code being the slow part. When
an agent produces a working change in an afternoon, the slow parts become the
ones built for human pace: gathering requirements, waiting for review, waiting
for a deploy window. Speeding up implementation alone just moves the queue.

This skill is about the other five stages. It assumes the constraint everywhere:
**humans make every judgment call, and the agent never approves its own work.**

## The artifact chain: how AI fits the software development lifecycle

Each stage ends by committing something the next stage reads. The commit history
becomes the audit trail: who asked, what the agent produced, who approved.

```
intent.md -> spec.md -> plan.md -> diff + tests -> PR + review findings -> incident record
```

| Artifact        | Written by                                  | Answers                                                                                  |
| --------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `intent.md`     | Whoever has the idea, with an agent         | Problem, proposed outcome, who and what it touches, constraints, open questions          |
| `spec.md`       | Product owner, with the org's skills loaded | What it does, and which policies it brushes against - flagged before engineering sees it |
| `plan.md`       | Engineer, in plan mode                      | Files affected, order of work, risks, and how it will be proven                          |
| The diff        | The agent                                   | Implementation, with tests that predate it                                               |
| Review findings | The agent, ranked by severity               | What a human should look at first                                                        |
| Incident record | Monitoring, via the agent                   | Feeds back into the next `intent.md`                                                     |

Versioned in the repository, reviewed as a merge. A decision recorded as a merged
file has an author and a timestamp; a decision recorded in a meeting does not.

## Plan before code

The cheapest moment to change direction is while the plan is still a document.

1. Give the agent the approved `spec.md` and the repository conventions.
2. Let it interview you until the plan covers affected files, work order, risks,
   and the proof that it worked.
3. Iterate on the plan, not the code.
4. Commit the plan. At review time, check the diff against it: a diff that
   diverged from an approved plan is the signal worth spending attention on.

With a solid plan, implementation often lands in one pass. Without one, the
review is where the design conversation finally happens, at the point where
changing it costs the most.

## Institutional knowledge is a file, not a habit

| Mechanism                   | Holds                                                                                 | Update when                                             |
| --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Repository instruction file | Conventions, commands, architecture, the mistakes that repeat                         | The agent gets the same thing wrong twice               |
| Skills                      | Policy that applies across repositories: security, API design, house style            | The policy changes, once, centrally                     |
| Hooks                       | The rules that must not be negotiable: protected paths, formatters, secrets in a diff | A rule turns out to need enforcement rather than advice |

The distinction that matters: **a skill makes the right thing easy, a hook makes
the wrong thing impossible.** Reach for the second only where advice has already
failed, because a false positive in a hard block costs more than the prompt it
saves.

## Feedback loops that verify their own work

Give the agent a target it can check itself against - the suite passes, the
screenshot matches, the guardrails report clean - and let it iterate until the
check passes rather than until it thinks it is done.

For a bug fix, the order is not negotiable: **write the failing test first**, then
fix. The test predates the fix, so it cannot be shaped to agree with it, and a
hook that blocks edits to test files during a fix keeps it that way.

## Review in both directions, and the human still approves

The agent reviews incoming changes against the same standards it writes to, with
a defined set of passes - correctness, security, policy, diff against plan - and
findings ranked by severity so attention goes to the top of the list.

Two rules make this safe:

- **The agent writes code and cannot approve it.** A human code owner approves.
  Separation of duties survives regardless of how good the review gets.
- **Corrections go back into the instruction file.** A mistake caught twice that
  is not written down will be caught a third time.

## Gates are deterministic, or they are suggestions

Approval gates are scripts, not judgment: allow, ask, or block, with the reason
stated. A production deploy blocked until a release manager authorizes it does
not depend on the model's mood, and the decision is logged with a timestamp.

Autonomy by environment, declared in version control: free in development,
bounded in staging, gated in production. The agent gets no production
credentials by default; deployment and rollback are exposed as tools, with
short-lived scoped tokens, and write steps land as pull requests rather than
direct commits.

## Maintenance and incidents: detection is deterministic, diagnosis is not

Watch one metric with a stable baseline - CI failure rate, post-deploy error
rate, cycle time - with a plain script and no model in the detection path. Then
escalate by how far it has moved:

| Band    | Action                                                            |
| ------- | ----------------------------------------------------------------- |
| 1 sigma | Log it                                                            |
| 2 sigma | The agent diagnoses, read-only, no fixes                          |
| 3 sigma | The agent proposes a pull request, or runs a pre-approved runbook |

The diagnosis is written as an `intent.md` and re-enters the pipeline at the
start. A person triages the queue; dismissals tune the bands. Every finding still
goes through the normal review gate.

## What we do differently: no subagents

The playbook this is drawn from suggests subagents and parallel sessions for
repeated work. **We do the opposite, deliberately.** NEVER spawn subagents for
research or implementation - they burn tokens. Use rule tools (deterministic,
LLM-free) and tokensave (code graph) instead. A subagent buys a fresh context
window to answer what a tool call answers for free, and the verification and
research jobs it is usually pointed at are exactly the jobs our tools already do
deterministically.

## The behaviors AI does not cover

Worth naming, because the stages above can make it look like the process runs
itself:

- **Contextualisation.** Knowing which constraint in this organization makes the
  obvious answer wrong.
- **Proactive engagement.** Raising the problem nobody has asked about yet.
- **Outcome-oriented communication.** Translating a technical position into the
  terms the decision-maker actually weighs.
- **Validation.** Deciding that the evidence is sufficient, and saying so on the
  record.
- **Owning the call.** Accountability does not delegate.

## Metrics worth tracking

| Stage    | Leading                          | Lagging                                      |
| -------- | -------------------------------- | -------------------------------------------- |
| Intent   | Hours to a committed `intent.md` | Acceptance rate; rework after spec           |
| Spec     | Time from intent to spec         | Rework cycles once build starts              |
| Build    | First-pass merge rate            | Rework per change; diff-plan divergence      |
| Test     | CI pass rate for agent changes   | Defects that escape to production            |
| Deploy   | Time to first review             | Defects found pre-merge versus in production |
| Maintain | Time from breach to triage       | Repeat incidents                             |

## Where to start

Any of these needs nothing else in place first: capturing intent as a file,
giving the agent a checkable target, or writing down one policy as a skill. Add
gates before automating anything that writes.

## See also

- [rule-mcp-evals](../rule-mcp-evals/SKILL.md) - the test stage in detail
- [rule-process-feature-workflow](../rule-process-feature-workflow/SKILL.md) - the same flow for one feature
- [rule-process-adr](../rule-process-adr/SKILL.md) - decisions that outlive the plan that produced them
- [rule-process-code-review](../rule-process-code-review/SKILL.md) - what the review passes look for
- [rule-mcp-prompting](../rule-mcp-prompting/SKILL.md) - working with the agent inside these stages
