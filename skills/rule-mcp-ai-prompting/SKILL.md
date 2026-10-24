---
name: rule-mcp-ai-prompting
description: >-
  Use when working with an AI coding agent, and when teaching someone to. Covers what a prompt needs, context engineering, the mistakes that waste the most tokens, when NOT to let AI write the code, and how to keep learning while using it.
tags:
  - prompting
  - prompt
  - context
  - agent
  - claude-code
  - workflow
  - junior
  - learning
  - tokens
  - ai
frameworks: [all]
---

# rule-mcp-ai-prompting - Working with an agent without outsourcing the thinking

## Purpose

Two skills are being confused with each other. Getting an agent to produce
working code is one, and it is learnable in a week. Knowing what to ask for,
what to check, and when not to ask at all is the other, and it is the one that
decides whether you can maintain what comes back.

This skill covers both, and is written for whoever is earliest in that.

## Writing a better prompt: what a prompt actually needs

Four parts. Missing any one of them produces a plausible answer to a different
question.

1. **The goal**, in outcome terms. "Users can reset a forgotten password", not
   "add a reset endpoint" - the second one has already made design decisions
   that were yours to make.
2. **The constraints.** Framework, versions, what must not change, what already
   exists. Most wrong answers are correct answers to an unconstrained problem.
3. **The evidence.** The actual file, the actual error, the actual schema. Not a
   description of them. An agent given a description invents the rest, and the
   invention is confident.
4. **The output shape.** A diff, a plan, a list of options, one function. Saying
   so prevents the four-file refactor you did not ask for.

Then read the answer as a proposal, not a result.

## Context engineering beats prompt tricks

The phrasing matters far less than what is in the window when the model reads it.
The levers below are the short version;
[rule-mcp-ai-context-engineering](../rule-mcp-ai-context-engineering/SKILL.md) is
the skill that owns the window - what earns a place in it, why adding a file can
make an answer worse, and when to compact, hand off or start fresh.

The levers, in order of effect:

- **Put the real thing in.** A schema, a failing test, an error with its stack.
- **Keep the noise out.** Forty files explored, three abandoned directions and a
  debugging session all sit in the window and all compete for attention. Start a
  fresh context for a new phase; do not carry the whole session into a task
  that needs none of it.
- **Write down what repeats.** Anything explained twice belongs in the repository
  instruction file, not in the next prompt.
- **Point, do not paste.** A path the agent can read beats a wall of pasted code,
  and costs a fraction of the tokens.

The rule-mcp tools exist for this last point: routing loads only the sections that
match, `mode=tldr` returns ranked sections instead of a whole file, and tokensave
answers structural questions from a code graph rather than from reading files.
NEVER spawn subagents for research or implementation - they burn tokens. Use
rule-mcp tools (deterministic, LLM-free) and tokensave (code graph) instead.

## The mistakes that cost the most

**Implementing before the agent understands the product.** The first prompt
should establish what this is and what matters. Skipping it produces generic
solutions and the impression that the model is mediocre.

**Turning the instruction file into a document dump.** It loads on every turn.
Durable rules and specific pointers belong there; a design system does not. The
test is whether the line would change an answer.

**Describing an interface with no reference.** A screenshot, a sketch or an
existing screen replaces three rounds of "not quite like that".

**Building the whole feature in one shot.** The larger the scope in one prompt,
the more generic the result. Slice it.

**Skipping plan mode on anything substantial.** The worst case is noticing the
misunderstanding when the agent is already halfway through editing files. A plan
is cheap to reject.

**One context for research, building, debugging and critique.** By the time you
have done all four, the window is mostly noise, and critique in the same context
as building is critique of your own work.

**Approving what you cannot read.** Clicking allow repeatedly is not delegation,
it is accepting a change you cannot review, cannot debug at 3am, and cannot
explain to whoever asks why it works.

## Learning mode for juniors: no code in, no code out

While you are learning something, treat the editor and the agent as separate
rooms. Do not paste generated code into your editor, and do not paste your
broken code in asking for the fix.

That rule sounds restrictive and is doing something specific: problem solving and
debugging are the two things practice builds, and both are exactly what a fix
handed to you skips.

The agent is still useful, in a different position:

| Instead of                | Ask                                                                      |
| ------------------------- | ------------------------------------------------------------------------ |
| "Solve this problem"      | "Explain why this approach uses a queue, with an analogy"                |
| "Why is my code failing?" | "Give me a tricky test case for this problem"                            |
| "Write the class design"  | "Give me the problem and the interfaces, review my implementation after" |
| "Is this good?"           | "Ask me ten questions on this topic, easy to hard"                       |

You keep doing the thinking; the agent explains, generates cases, and reviews.
That is a completely different learning outcome from a correct answer arriving.

## Where to use AI heavily: teaching, tutoring and review

The rule inverts for understanding. Explaining a concept five ways, at five
levels, on demand, is the thing an agent is genuinely best at:

- "Explain this like I am new to it", then "give me a real-world analogy", then
  "explain it at interview level".
- "Walk this input through the algorithm step by step."
- "What would break in this design at ten times the traffic?"
- "Review my design for coupling and responsibilities" - after you wrote it.

Use it heavily for learning. Use it carefully for producing.

## Reviewing what comes back

- **Does it do what was asked, and only that?** Unrequested extras are the most
  common defect (see [rule-mcp-process-ai](../rule-mcp-process-ai/SKILL.md)).
- **Does every API in it exist?** Confident invention is the failure mode of
  these models. Verify against the evidence, not against how right it sounds.
- **Did the tests come first, and do they fail without the change?**
- **Can you explain each decision?** If not, you are not ready to approve it.
- **Did the guardrails run?** `rule_tool_check` is not an opinion.

## When to stop prompting

Reprompting a third time on the same problem usually means the problem is not
the prompt. Read the code. Add a log line. Reproduce it smaller. Five minutes of
reading often beats three more attempts, and it leaves you knowing something.

## See also

- [rule-mcp-process-ai](../rule-mcp-process-ai/SKILL.md) - where these prompts sit in the lifecycle
- `rule_tool_compress` / `/rule-compress` - sole compression engine (ADR 115)
- [rule-mcp-process-ai](../rule-mcp-process-ai/SKILL.md) - the scope contract to hold agents to
- [rule-mcp-ai-context-engineering](../rule-mcp-ai-context-engineering/SKILL.md) - managing the window this prompt lands in
- [rule-mcp-ai-evals](../rule-mcp-ai-evals/SKILL.md) - measuring an AI feature rather than trusting it
