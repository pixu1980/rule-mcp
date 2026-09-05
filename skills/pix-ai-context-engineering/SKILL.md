---
name: rule-mcp-context-engineering
description: >-
  Use when an agent session is getting expensive, slow or worse at its job. Covers the context window as a budget, why adding files degrades answers, the levels of delegation from autocomplete to autonomous, compaction and handoff, pointing at evidence instead of pasting it, and what actually consumes a usage limit.
tags:
  - context
  - context-window
  - context-engineering
  - compaction
  - handoff
  - tokens
  - agent
  - session
  - retrieval
  - delegation
  - usage-limit
frameworks: [all]
---

# rule-mcp-context-engineering - The window is the product

## Purpose

[rule-mcp-prompting](../rule-mcp-prompting/SKILL.md) is about what you write.
This is about what is in the window when the model reads it, which decides more.

One idea underneath all of it: **the window is not storage, it is attention.**
Everything in it competes with everything else. That is why a session gets worse
as it gets longer even though nothing was removed, and why the instinct that
adding one more file can only help is wrong.

## Context is a budget, not a bucket

Every token in the window was chosen by someone, even when nobody decided. Four
things spend the budget, and only one of them is the task:

| Spender                            | Paid                                | Controllable                                  |
| ---------------------------------- | ----------------------------------- | --------------------------------------------- |
| System prompt and tool definitions | Every turn, before anything happens | Yes, and it is the highest-leverage line item |
| Instruction files                  | Every turn                          | Yes, by keeping them short and true           |
| Conversation so far                | Every turn, growing                 | Yes, by starting fresh                        |
| The task                           | Once                                | Mostly no                                     |

The first line is the one teams never look at. It is paid on every turn of every
session, including the turns that do nothing, and it is invisible because nobody
typed it. Measure it before optimizing anything else: this project assumed its
tool descriptions were the weight and found they were an eighth of it, and the
real cost was a schema repeated once per tool.

The rule that follows: **a token paid on every turn is worth roughly a hundred
paid once.** Trim there first, even when the saving looks small.

## Less context beats more

Adding a file to the window has three costs and one benefit, and the benefit is
the only one that is obvious.

- **It dilutes.** Relevance is relative. Ten files that matter plus forty that do
  not is a worse signal than the ten alone.
- **It contradicts.** Two versions of the same function, one from a branch and
  one from main, and the model cannot tell which is current. Neither can it tell
  you it is guessing.
- **It anchors.** An abandoned approach still in the window keeps being
  reconsidered. The model has no way to know you rejected it unless you said so.

So the question at the boundary is not "could this help" but **"what does this
displace"**. If the answer is nothing, the window was not full and the file is
free. If the window is already working, the file has to earn its place against
something already in it.

The practical form: when an answer starts drifting, the reflex should be to
remove context, not add it.

## The levels of delegation, and picking one on purpose

Most disappointment with an agent is a mismatch between the level of delegation
the person intended and the level the situation supported.

| Level       | You supply                            | The model supplies                 | Fails when                                  |
| ----------- | ------------------------------------- | ---------------------------------- | ------------------------------------------- |
| Completion  | Everything but the next few tokens    | Local pattern                      | Never usefully; it cannot be wrong for long |
| Instruction | The exact change, the file, the shape | The typing                         | The instruction was ambiguous               |
| Task        | The goal and the constraints          | The plan and the edits             | The constraints were implicit               |
| Supervision | The goal, and review at each step     | The plan, the edits, the checks    | Review is skipped because it looks fine     |
| Autonomy    | The goal and a way to verify          | Everything, including when to stop | There is no mechanical verification         |

The gradient that matters: **each level up trades your attention for the model's
throughput, and only pays if verification survives the trade.** Autonomy without
a test suite is not autonomy, it is unreviewed output with a longer feedback
loop. Pick the highest level whose verification you actually have.

## Retrieval over recall: point, do not paste

Pasting is recall - putting the answer in the window in advance, in case it is
needed. Retrieval is pointing at where the answer is and letting it be fetched
when it is.

Retrieval wins on three axes at once, which is rare:

- **Cost.** A path is a dozen tokens; the file is thousands.
- **Freshness.** A path reads the current file. A paste is a snapshot that
  silently ages inside the conversation.
- **Precision.** A retrieval can return the matching sections; a paste returns
  everything, and the reader has to find the part that matters.

This is what a routed, section-level tool surface is for: a prompt scores against
headings and only the matching sections come back. A code graph does the same for
structural questions - who calls this, what breaks if I change it - which are
questions a file dump answers badly and an index answers exactly.

The failure mode to watch for: **retrieval that returns too much is a paste with
extra steps.** If a search returns fifteen sections, the query was too broad, not
the corpus too small.

## Compaction, handoff, and starting fresh

Three different tools for three different situations, routinely confused.

**Compaction** rewrites the conversation shorter and keeps going. Cheap, and it
loses whatever the summarizer judged unimportant. Good when the thread is long
but coherent, and the recent turns are what matter.

**Handoff** writes down the state deliberately - the branch, the range of
commits, the files in flight, the decisions pending, what not to undo - so a new
session can start from it. More work, and it survives things compaction does not:
a crash, a model switch, a colleague, a week.

**Starting fresh** discards the thread. Right far more often than it feels,
because a new phase of work usually needs almost none of the previous phase's
context, and everything it carries in dilutes and anchors.

The rule: **compaction for length, handoff for a boundary, fresh for a new
phase.** And a handoff is written in the present tense, so it stops being true
without saying so - read it back with something that verifies its claims rather
than trusting them. See
[rule-process-handoff](../rule-process-handoff/SKILL.md).

## Techniques that survive contact

Most prompt advice does not survive a real codebase. These do, and each earns its
place in the window.

- **Few-shot with real examples.** Two examples from this repository beat six
  invented ones, because they carry the conventions along with the shape. Include
  a negative example when the failure mode is subtle.
- **Decomposition, made explicit.** Ask for the plan, review the plan, then ask
  for the work. The review is the point: a wrong plan costs a sentence to fix and
  an hour to unpick after implementation.
- **Self-check against a stated criterion.** "Check this against the guardrails"
  works; "are you sure" does not. The criterion has to exist outside the model.
- **Naming the failure mode.** Saying what going wrong looks like is worth more
  than saying what right looks like, because right is usually obvious and the
  specific way it breaks is not.
- **Stating what not to do.** An instruction to avoid something is only useful
  with the reason attached, or it gets generalized in the wrong direction.

What does not survive: politeness, urgency, threats, offers of payment, and any
instruction that describes a state of mind rather than a criterion.

## What actually consumes a usage limit

A limit is consumed by tokens processed, not by messages sent, and the biggest
consumers are the ones nobody watches.

- **A long conversation reprocesses itself.** Every turn pays for the whole
  thread again. Two sessions of ten turns cost far less than one of twenty.
- **A big tool surface is paid on every turn.** Even the turns that call nothing.
- **Re-reading is the quiet one.** An agent that reads the same file in three
  turns paid for it three times. A cache or an index that answers the second and
  third read is worth more than any prompt change.
- **Failed work is paid in full.** A rejected diff cost the same as an accepted
  one, so the cheapest optimization available is usually a clearer constraint up
  front rather than a faster loop.
- **Verification is cheap and skipping it is not.** A test run costs almost
  nothing next to the tokens spent debugging a change nobody checked.

The order to attack, from cheapest to hardest: trim what is paid every turn,
start fresh more often, index instead of reading, then improve the prompts.

## Checklist for a session that has gone bad

- [ ] Is the window carrying a phase that is finished? Start fresh
- [ ] Is there a rejected approach still in it? Say so explicitly, or start fresh
- [ ] Is the same file being read repeatedly? Point at an index instead
- [ ] Is anything explained twice? It belongs in the instruction file
- [ ] Is a per-turn cost being paid for a capability nobody uses? Measure it
- [ ] Is the delegation level higher than the verification supports? Drop one

## See also

- [rule-mcp-prompting](../rule-mcp-prompting/SKILL.md) - what to write, once the window is right
- [rule-mcp-agent-architecture](../rule-mcp-agent-architecture/SKILL.md) - the loop that fills the window
- [rule-process-handoff](../rule-process-handoff/SKILL.md) - writing a boundary down, and reading it back verified
- [rule-caveman](../rule-caveman/SKILL.md) - compressing output without losing substance
- [rule-mcp-evals](../rule-mcp-evals/SKILL.md) - measuring whether any of this helped
