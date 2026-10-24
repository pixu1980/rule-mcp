---
name: rule-mcp-ai-evals
description: >-
  Use when building or auditing evals for an AI feature. Covers error analysis before writing any eval, binary LLM-as-judge design, judge calibration against human labels with TPR and TNR, RAG evaluation, synthetic test inputs, and running evals in CI.
tags:
  - evals
  - evaluation
  - llm-judge
  - error-analysis
  - failure-modes
  - annotation
  - calibration
  - rag
  - testing
  - ai
frameworks: [all]
---

# rule-mcp-ai-evals - Measure the feature, not the model

## Purpose

Product evals answer "is this feature working for my users". Foundation-model
benchmarks answer something else entirely, and borrowing their metrics is the
most common way an eval effort produces numbers nobody acts on.

The order below is the whole method. Most teams start at step three, writing
judges for failure modes they guessed at, and then wonder why the scores never
move.

## Error analysis first: look at your traces before writing a single eval

You cannot evaluate failures you have not seen. Error analysis comes first,
every time.

1. **Read the data.** Ten records across the distribution. What fields exist,
   which one is the thing a human judges, which are context, which vary.
2. **Sample for diversity, not randomly.** Cluster on whatever varies - topic,
   length, number of turns, tool calls, outcome - and take cluster
   representatives plus some random picks. Random sampling alone oversamples
   the common case, which is the case you already understand.
3. **Annotate in free text.** Open-ended notes on what is wrong. Do not start
   from a category list: the list is the output of this step, not the input.
4. **Cluster the notes into failure modes.** Each one gets a name and a
   description precise enough that two people would label the same trace the
   same way.
5. **Count them.** A failure mode affecting 30% of traces and one affecting 2%
   are not the same priority, and without counts every conversation about
   quality becomes a debate about anecdotes.

Only now do you know what to measure.

## A review interface pays for itself in the first hour

Reviewing traces in a terminal or a spreadsheet is slow enough that people stop
after twenty. Build a single-file HTML app served by the standard library, with
no dependencies and no build:

- One record per screen, keyboard navigation between records.
- Visual encoding that matches what varies: color for role or category, spacing
  for hierarchy, dimming for boilerplate like a repeated system prompt.
- A free-text box that saves on keystroke, plus previous and next.
- Progress and coverage visible at all times.

For multi-turn traces, group by logical step - thinking, tool call, tool result -
rather than showing a flat message list. The reviewer is looking for where the
run went wrong, and that is a step, not a message.

## Reach for code before reaching for a judge

Many failure modes that sound subjective are decidable in code once you
understand the domain: a regex, a schema check, a parse, an execution test, an
API lookup. A code check is deterministic, free, instant, and testable with
ordinary unit tests.

Use an LLM judge only for criteria that genuinely need interpretation: tone,
faithfulness to a source, relevance, completeness.

## One judge, one failure mode, binary output

No Likert scales, no 1-to-5 quality scores, no letter grades. A judge that
returns 3.5 gives you nothing to act on, and two runs will not agree on whether
it was 3 or 4. Pass or Fail, one failure mode per judge.

Every judge prompt has four parts:

1. **The task and the criterion.** "Assess whether the reply uses the tone
   defined for this customer segment", not "evaluate whether the reply is good".
2. **Pass and Fail definitions**, taken verbatim from the failure-mode
   descriptions error analysis produced, with concrete examples of each.
3. **Few-shot examples** drawn only from the training split, and only clear-cut
   cases.
4. **The output format**: the verdict, plus a one-line reason. The reason is what
   makes a disagreement debuggable.

## Calibrate the judge, or you are measuring the judge

An uncalibrated judge is an unknown instrument. Split the human-labeled data
into three disjoint sets and keep them disjoint:

| Split | Share  | Use                                                           |
| ----- | ------ | ------------------------------------------------------------- |
| Train | 10-20% | Few-shot examples inside the prompt                           |
| Dev   | 40-45% | Iterate against, repeatedly                                   |
| Test  | 40-45% | Measured once, at the end, never looked at during development |

Aim for roughly balanced classes even when production is skewed: you need enough
Fail examples to measure the Fail side at all.

Measure **TPR** (of the traces a human passed, how many the judge passed) and
**TNR** (of the traces a human failed, how many the judge failed). Not accuracy,
which a skewed set makes meaningless, and not precision or recall - these two
are the pair that feeds the correction below. Iterate on the prompt until both
clear 90% on dev, then run the test set once.

Inspect every disagreement. Judge passed what a human failed means the Fail
definition is too weak. Judge failed what a human passed means the Pass
definition is too narrow. Fix the prompt; do not relabel the data to agree with
the judge.

Labels must come from someone who knows the domain. Outsourced annotation on a
subjective criterion produces a calibrated judge that agrees with the wrong
answer.

## Correct the aggregate rate before reporting it

A judge with known error rates produces a biased pass rate on unlabelled
production data. The Rogan-Gladen correction removes the bias:

```
theta = (p_obs + TNR - 1) / (TPR + TNR - 1)
```

`p_obs` is the fraction the judge passed, TPR and TNR come from the test set.
Clip to [0, 1]. The formula is invalid when `TPR + TNR - 1` approaches zero,
which means the judge is no better than a coin and the number should not be
reported at all.

With TPR 0.92, TNR 0.88 and 80% observed pass rate, the corrected estimate is
85%, not 80%. Report a bootstrap confidence interval with it: a point estimate
from a few hundred traces is not a measurement.

## Evaluating RAG: retrieval and generation fail differently

Evaluate them separately or you cannot act on the result.

- **Retrieval**: did the relevant chunk come back at all, and how far down. Recall
  at k and MRR. A generation failure caused by a missing chunk is a retrieval
  bug, and no amount of prompt work fixes it.
- **Generation**: given the retrieved context, is the answer faithful to it, and
  does it answer the question. Faithfulness and relevance are separate judges,
  because an answer can be perfectly grounded and useless.

## Synthetic inputs by dimension, not by asking for more examples

"Generate 100 test questions" produces 100 variations of the same question.
Instead name the dimensions that matter - user type, intent, length, tone,
locale, edge condition - and generate the tuples, then one input per tuple. The
coverage is legible, and the gaps are visible.

Synthetic data is for coverage of inputs you can construct. It never replaces
real traces for discovering failure modes, because the failures you can imagine
are not the ones that hurt.

## Evaluate continuously: evals in CI, including for the agent configuration

Collect 20 to 50 real tasks with expected outcomes and run them on a schedule.

Run them **on changes to the agent configuration too** - the instruction files,
the skills, the hooks. Those are code: a wording change alters behavior, and
without a regression suite the change is unverified. Gate the configuration
change on the eval result.

Every production incident earns an eval, and that eval stays in the suite
permanently. This is the mechanism that stops a fixed bug from returning.

## Generating tests with a model: what it does well, and what it gets wrong quietly

Generated tests are the case where a bad result looks exactly like a good one:
green. The split below is worth knowing before deciding what to hand over.

**What it does well**

- **Unit tests for pure functions.** Given these inputs expect these outputs, a
  predictable structure, deterministic assertions. Twenty minutes of typing
  becomes a few, and the shape that comes back is usually sound. Timezone and
  locale edges still want a reader.
- **Finding the gaps in a suite you already have.** This works better than
  generating from nothing, because the model can see the whole suite rather than
  one signature: which branches are unexercised, which error paths are untested,
  which integration path nobody covered. The output is a prioritized list you
  implement deliberately, not a pile of files you hope are right.
- **Scaffolding from an interface specification**, with one qualifier that
  decides everything. The tests are as accurate as the specification, so on a
  spec that has drifted you get tests that validate the documentation instead of
  the code, and they pass.

**What fails quietly**

- **The code and its mocks share one blind spot.** Ask for a client and then, in
  the same session, for its tests: both encode the same belief about how the
  upstream behaves. If that belief is stale, the code looks right, the mocks
  agree with it, the suite is green, and production is the only thing that
  disagrees. Interceptors and handwritten fakes are accurate the day they are
  written and degrade in silence after that.
- **Integration tests that are complete about what the model could see.** With a
  wide dependency graph the model tests the interaction it had in view and
  misses that the same endpoint also updates inventory, sends a notification and
  writes an audit row. The result reads as thorough. Completeness is the part a
  human still owns.
- **Flaky async assertions, at a rate nobody reports.** Hardcoded timestamps
  that should have been controlled, assertions on request IDs that change every
  run, timing that passes locally and fails in CI. It passes the first two
  times. It fails on a Thursday, and nobody catches it in review, because the
  test looked right and the reviewer did not write it.

**The one root under all three:** the tests were generated from a specification
frozen at generation time, not from behavior observed now. A prompt, a doc and a
type all describe intended behavior. Current behavior has to be watched.

That points at the split worth adopting:

| Layer                                           | Generate from                              | Why                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit, and deliberately designed edge cases      | A model                                    | Structure is predictable and the assertions are decidable                                                                                            |
| Integration                                     | Observed traffic between the real services | Only observation reflects how they behave today, and repeated observation is what identifies the non-deterministic fields to leave out of assertions |
| The scenarios the business actually cares about | A person                                   | No generator proposes them without being told they matter                                                                                            |

Two habits keep this honest. **Review a generated test for what it does not
assert**, since that is where the blind spot lives, and treat a suite that has
never failed as unproven rather than as passing. And **re-observe**: a fake that
no longer matches what the real dependency returns should surface as a
discrepancy before it surfaces as an incident.

## On the method

Error analysis before evals, binary judges, and calibration against human labels
are established practice in the eval community rather than anything invented
here. This skill is our own write-up of that method, adapted to this toolchain;
nothing is reproduced from anyone else's material.

## See also

- [rule-mcp-process-ai](../rule-mcp-process-ai/SKILL.md) - where evals sit in the lifecycle
- [rule-mcp-ai-agent-architecture](../rule-mcp-ai-agent-architecture/SKILL.md) - building the agent these evals measure
- [rule-mcp-devops-testing](../rule-mcp-devops-testing/SKILL.md) - the deterministic tests underneath
- [rule-mcp-ai-prompting](../rule-mcp-ai-prompting/SKILL.md) - writing the prompts being evaluated
