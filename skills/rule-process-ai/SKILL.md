---
name: rule-process-ai
description: >-
  Use when planning how AI fits the delivery lifecycle rather than a single task, or when
  writing anything a reader will see. Covers the artifact chain from intent to incident, plan
  before code, the scope contract and the over-engineering catalog, English with American
  spelling and ASCII punctuation, and the phrasing that reads as machine-written.
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
  - simplicity
  - scope
  - yagni
  - english
  - american-english
  - prose
  - punctuation
frameworks: [all]
guardrails:
  [
    ai-english-only-filenames,
    ai-english-only-prose,
    ai-american-english,
    ai-no-emdash,
    ai-no-typographic-chars,
    ai-box-rectangular,
    ai-no-placeholder-implementation,
    ai-no-speculative-audit-table,
    ai-no-suppressed-errors,
  ]
---

# rule-process-ai - When code stops being the bottleneck

## Purpose

The delivery process most teams run was shaped by code being the slow part. When
an agent produces a working change in an afternoon, the slow parts become the
ones built for human pace: gathering requirements, waiting for review, waiting
for a deploy window. Speeding up implementation alone just moves the queue.

This skill is about the other five stages. It assumes the constraint everywhere:
**humans make every judgment call, and the agent never approves its own work.**

## What this skill owns

Four disciplines, one document each. The body below is the lifecycle; the three
references are the parts that apply to every change, not only to an AI one.

| Document                                               | Read it when                                                                                                    | Guardrails behind it                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [references/simplicity.md](references/simplicity.md)   | before and during implementation: the scope contract, the over-engineering catalog, the removal pass, file size | `ai-no-speculative-audit-table`, `ai-no-placeholder-implementation`, `ai-no-suppressed-errors` |
| [references/english.md](references/english.md)         | writing any comment, identifier, commit, prompt or document: English, American spelling, ASCII punctuation      | `ai-english-only-filenames`, `ai-english-only-prose`, `ai-american-english`                    |
| [references/fingerprint.md](references/fingerprint.md) | writing prose a reader will see: banned characters, drawn boxes, the phrasing that reads as machine-written     | `ai-no-emdash`, `ai-no-typographic-chars`, `ai-box-rectangular`                                |
| this file                                              | planning how AI fits the lifecycle: artifacts, plan before code, gates, review, incidents                       | none, deliberately: a gate is a script, and a model in the gate is a suggestion                |

The three references were separate skills until they were merged here. The
spelling map existed twice, in the English skill and in the fingerprint one, and
two documents citing the same rule is the drift the guardrail already inherits.

## Scope comes first

Before the lifecycle, the change itself. A model asked for one thing will produce
that thing plus a generalized version, an audit table nobody reads and a flag
nothing reads. The contract that stops it, in six lines:

1. Implement exactly what the request states: not the generalized version, not
   the version that anticipates next quarter.
2. Extra scope is proposed in prose, never written. A proposal costs a line; an
   unrequested schema change costs a migration, a review and a rollback.
3. Declare `files_to_change` and `out_of_scope` before coding.
4. One implementation means no abstraction: interfaces, base classes and strategy
   objects arrive with the second caller, not the first.
5. No code for an imagined future: no parked implementations, no configuration
   flags nothing reads, no speculative index.
6. When in doubt, ship the smaller version and list what you left out.

The full over-engineering catalog (extra columns, audit and history tables,
retry and cache added preemptively, layers that only forward) and the removal
pass that walks your own diff live in
[references/simplicity.md](references/simplicity.md). Schema changes get their
own checklist there: who writes the column, who reads it, which existing column
already holds the value, and whether it is derivable.

## The house language

Every artifact this server writes is English, in American spelling, in plain
ASCII. To americanize a comment, a name or a document is to apply exactly that: no em dash, no curly quotes, no ellipsis glyph, no British spelling
(colour, behaviour, organise, centre, licence). The request may arrive in any
language; the file that lands is English. A translated user-facing string is data
and belongs in a message table, never in a comment or an identifier.

Three guardrails hold that line, and the prose rules that make text read as
typed by a person rather than generated sit beside them. The spelling map, the
exceptions (a third-party API keeps its own spelling) and the phrasing tells live
in [references/english.md](references/english.md) and
[references/fingerprint.md](references/fingerprint.md).

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
research or implementation - they burn tokens. Use rule-mcp tools (deterministic,
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

## Writing code got faster, delivering software did not: the parts of the job that do not compress

Writing code got dramatically easier. Software engineering did not, and the two
were always different problems. Keeping them apart is what stops a team from
concluding that because generation is fast, delivery should be.

Below a handful of people in one room, none of this applies: no coordination
overhead, no review circles, compliance is a spreadsheet, and an agent is a
genuine multiplier. Run. Somewhere past a few dozen people the physics change.
Coordination cost arrives and never leaves, and it cannot be opted out of,
because growing is how the work reaches more people in the first place.

What generation did not repeal:

- **Maintainable code**, because somebody carries the pager for it.
- **A real rollout process**, because a bad deploy in a regulated environment is
  not a rollback, it is an incident report.
- **Tests that someone reads**, because customers ask to see the results.

And what got scarcer rather than cheaper: **deciding what to implement, and
defending that decision through an organization that has opinions.** Knowing the
right answer is a small fraction of the work. The rest is agreeing that the
artifact satisfies the actual requirement, getting the team that will own a piece
of it to agree, finding the budget and the people, and getting a decision from a
room where two of the parties are arguing about something from last year. No
generator does that, and the plan that skips it does not ship.

Two consequences worth acting on:

- **Stay hands-on, deliberately.** The moment you stop touching the code, your
  architecture opinions drift into fantasy, and you become the person who says
  "just add a flag" to a system where a flag costs three days. Shipping something
  small on purpose is what keeps a review honest.
- **Speed of writing is the wrong metric to optimize.** It measures the part that
  was already the easiest to explain. Optimize the decision that precedes it and
  the ownership that follows it.

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

- [references/simplicity.md](references/simplicity.md) - build only what was asked
- [references/english.md](references/english.md) - the house language
- [references/fingerprint.md](references/fingerprint.md) - prose that reads as typed by a person
- [rule-ai-evals](../rule-ai-evals/SKILL.md) - the test stage in detail
- [rule-process-adr](../rule-process-adr/SKILL.md) - decisions that outlive the plan that produced them
- [rule-process-code-review](../rule-process-code-review/SKILL.md) - what the review passes look for
- [rule-ai-prompting](../rule-ai-prompting/SKILL.md) - working with the agent inside these stages
