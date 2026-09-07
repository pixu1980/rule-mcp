---
name: rule-ai-agent-architecture
description: >-
  Use when building or reviewing an agent, an MCP server, or a tool surface. Covers what actually happens at the API boundary when a tool call happens, why the harness and not the model decides quality, loops against graphs, what MCP does and does not give you, tool granularity and naming, and exposing an application as a tool surface.
tags:
  - agent
  - agents
  - harness
  - agent-loop
  - tool-call
  - tool-surface
  - mcp
  - orchestration
  - architecture
  - protocol
frameworks: [all]
---

# rule-ai-agent-architecture - The harness is the product

## Purpose

[rule-platform-agent](../rule-platform-agent/SKILL.md) is how a scaffold is
structured. This is the architecture underneath: This is the architecture underneath: what the loop is, what the
protocol carries, and which decisions determine whether an agent is any good.

One fact sits under all of it, and misunderstanding it produces most bad agent
design.

## The model does not call your tool

**It emits text. A loop you wrote decides to interpret that text as a call.**

What happens on the wire, in order:

1. You send a request containing the conversation and a list of tool
   definitions - a name, a description, a parameter schema.
2. The model returns either a message or a structured block naming a tool and
   some arguments. That block is generated text in a shape the API validates.
3. **Your code** reads it, decides whether to honor it, runs something, and puts
   the outcome back into the conversation as another message.
4. Go to 1.

Three consequences follow, and every one of them is a design lever the model
does not touch:

- **Nothing was executed by the model.** Every guard, permission check, timeout
  and refusal is yours, and lives in step 3. An agent is exactly as safe as that
  step.
- **The tool definitions are a prompt.** They are the only description of the
  capability the model ever sees, and they are re-sent every turn. Naming and
  wording change behavior as much as any instruction, and length is paid
  continuously.
- **The result is context.** A tool that returns forty kilobytes has not helped;
  it has spent the window. What a tool returns is a design decision of the same
  weight as what it does.

## The harness decides quality, not the model

Swapping models moves an agent's quality a little. Changing the harness moves it
a lot. The parts that decide, roughly in order:

| Part                     | Decides                                                |
| ------------------------ | ------------------------------------------------------ |
| What is in the window    | Whether the right answer is reachable at all           |
| Tool granularity         | How many turns a task takes, and how many can go wrong |
| What tools return        | Whether turn three still has room to work              |
| Verification in the loop | Whether a wrong step is caught or compounded           |
| Stop conditions          | Whether it finishes, loops, or quits early             |
| Error text               | Whether a failure is recoverable or repeated verbatim  |

The last one is undervalued. An error that says what to do next is a repair
instruction; one that says `invalid argument` is a coin flip. Write tool errors
for a reader who cannot see your code, because that is exactly the situation.

## A loop, until a graph earns it

A `while` loop with tools is the right default, and it is enough for most work.
Reach for an explicit graph when one of these is true, and not before:

- **Fan-out with a join.** Several independent branches whose results must be
  combined. A loop does these in sequence for no reason.
- **A step must not be skipped.** A required review, an approval, an audit
  record. In a loop that is a hope; in a graph it is an edge.
- **The retry policy differs per step.** One step is idempotent and one is not.
- **Someone else has to read the flow.** A diagram of a graph is honest; a
  diagram of a loop is a picture of a loop.

The cost is real: a graph fixes the shape of the work in advance, and most tasks
do not have a shape until they are underway. The failure mode of graph-first is
an elaborate pipeline for a problem that needed three tool calls.

**Prefer the loop, and note the moment you wanted a barrier.** That moment is the
evidence, and it either arrives or it does not.

## MCP: what the protocol gives you, and what it leaves

What it gives:

- **One transport for many hosts.** A server speaks stdio or HTTP and any
  compliant client can use it, so a capability is written once.
- **Three surfaces with different semantics.** Tools are actions the model may
  invoke; resources are content a client can read on its own; prompts are
  parameterized templates a person invokes. Putting a capability on the wrong one
  is the most common design error here - a thing a user chooses is a prompt, not
  a tool.
- **A discovery handshake.** Capabilities are listed, so a client adapts without
  being rebuilt.

What it leaves entirely to you:

- **Authorization.** The protocol carries no notion of what a caller may do.
- **Determinism.** Nothing prevents a tool returning something different for the
  same input, and nothing tells the caller it did.
- **Cost.** Every definition in the list is paid on every request by every caller,
  and the protocol has no opinion about how many there should be.
- **Meaning.** A schema constrains shape and says nothing about correctness.

The one number worth guarding: **the size of the tool list.** It is the only
output paid before the model has decided to do anything, and it grows silently
with every capability added.

## Tool surface design

The decisions, and the way each one goes wrong:

**Granularity.** Too fine and a task takes fifteen turns, each able to fail. Too
coarse and the tool needs a mode parameter for every situation and the model
picks the wrong one. The useful test: **a tool should correspond to a decision a
caller makes**, not to a function you happen to have.

**Naming.** The name is read more often than the description. Prefix by domain so
related tools sort together, and never name two tools such that the difference
between them is a word neither name contains.

**Modes over multiplication.** One tool with `mode` beats five near-identical
tools, because five near-identical descriptions are five chances to pick wrong
and five times the surface. The line: same subject, different depth is a mode;
different subject is a tool.

**What tools return.** Return the smallest thing that answers the question, and
make the shape stable so a caller can rely on it. A tool that sometimes returns
prose and sometimes JSON cannot be built on.

**Never expose.** A tool that takes a shell command, a raw query, or an arbitrary
path, unless containment is the tool's actual subject. A tool whose blast radius
is larger than its name suggests. And anything whose failure is silent.

**Determinism where possible.** A tool that computes rather than asks a model is
cheaper, replayable, testable, and cacheable. Every capability that can be
deterministic should be, and the ones that cannot should say so.

## Agents in the browser: an application as a tool surface

A page can expose its own capability to an agent instead of being driven through
its interface. It is worth understanding why that is better than automation, and
where it goes wrong.

Driving the interface means the agent infers intent from layout, and every
redesign breaks it. Exposing capability means the application states what it can
do, and the contract survives the redesign. Same argument as an API against
scraping.

Two rules carry most of it:

- **A form is a bad tool definition.** It encodes a data-entry order for a human
  with a mouse. What an agent needs is the operation and its real parameters, not
  eleven fields in tab order.
- **The trust boundary does not move.** A capability exposed to an agent in the
  page is exposed to whatever is driving that agent, and page content is
  attacker-controlled in ways a server call is not. Authorize the operation, not
  the caller's claim about who they are.

## Judging an agent framework

Frameworks are converging on the same loop, so the differences that matter are
not features:

- **Can you see the raw exchange?** If the actual request and response are hidden,
  every debugging session is guesswork.
- **Is the loop yours?** A framework that owns the loop owns the decisions in the
  table above, and you will eventually need one of them back.
- **What does it put in the window without asking?** Read what it actually sends,
  once. It is often the whole answer about a framework's quality.
- **Does it make verification easy?** If evaluating a change is hard, the agent
  will not improve.
- **How much does it cost to leave?** The loop is a hundred lines. Anything
  charging more than that in lock-in should be replacing more than the loop.

## Checklist before shipping an agent

- [ ] Every tool call passes through code that may refuse it
- [ ] The tool list has a measured size, and a budget that fails the build
- [ ] Every tool returns the smallest useful answer, in a stable shape
- [ ] Every error text tells the caller what to do instead
- [ ] Stop conditions exist and are tested, including the pathological ones
- [ ] Anything that can be deterministic is
- [ ] Capability boundaries are authorized server-side, not in the page
- [ ] The raw exchange can be inspected without patching the framework

## See also

- [rule-platform-agent](../rule-platform-agent/SKILL.md) - scaffold structure for an agent repository
- [rule-ai-context-engineering](../rule-ai-context-engineering/SKILL.md) - the window the loop fills
- [rule-ai-evals](../rule-ai-evals/SKILL.md) - deciding whether a harness change helped
- [rule-process-ai-sdlc](../rule-process-ai-sdlc/SKILL.md) - where an agent sits in the delivery process
- [rule-backend-security](../rule-backend-security/SKILL.md) - authorizing the operation rather than the claim
