---
name: rule-process-handoff
description: >-
  Use when closing a session or resuming one. Covers writing a compressed handoff (ADR log, project context, git state) and reading the last one back with handon, which verifies which of its claims are still true.
tags:
  - handoff
  - handon
  - resume
  - recovery
  - context
  - transfer
  - session
frameworks: [all]
---

# rule-process-handoff - LLM Context Handoff

## Purpose

When an AI-assisted session ends (chat timeout, model switch, context full, human handoff),
**rule-process-handoff** generates a compact prompt that lets a **new LLM session** pick up exactly
where the previous one left off - with zero Q&A to re-establish context.

## Use Cases

| Use Case            | When                                       | Why                                             |
| ------------------- | ------------------------------------------ | ----------------------------------------------- |
| **Chat recovery**   | Browser refresh / timeout / new chat       | Paste handoff -> continue without re-explaining |
| **Model swap**      | Switching GPT -> Claude -> Gemini mid-task | Handoff normalizes context across models        |
| **Session handoff** | Hand work to a colleague                   | A->B: paste handoff, B picks up instantly       |

## How It Works

1. `rule-process-handoff` scans the project for:
   - All ADR files in `docs/adr/` - extracts titles, statuses, tags
   - `.context/` files - extracts project values and decisions
   - Project identity from `package.json` or `CONTEXT.md`

2. It compresses everything into a **single prompt block** (≈150-400 lines) that:
   - States the project identity and current state
   - Lists all ADRs with status and key decisions
   - Condenses `.context/` values into a flat key-value table
   - Ends with the **Resume Prompt** the receiving LLM opens with

The document closes with that last block, under a `### Resume Prompt` heading and
inside a ` ```prompt ` fence. It is the one part of the handoff written to be
pasted rather than read: whoever persists the file adds the path of the document
and the first step of the next session to it, and nothing follows it. `handon`
reads it back and reports it verbatim as `## Prompt to run next`, so the block
travels with the file instead of living only in a chat that has since closed.

3. The output is emitted via the **MCP tool** `rule_tool_process_handoff` or the **CLI** `rule-mcp handoff`.

## Output Format

The handoff opens with the project identity and closes with the resume prompt:

````
## HANDOFF: Project Name

### Identity
Project type, stack, framework, target.

### ADR Log
001 | accepted | Initial architecture - chose layered pattern
002 | proposed | Database selection - PostgreSQL vs SQLite

### State Snapshot
PROJECT_TYPE=webapp
STACK=react
...

### Resume Prompt

The next session opens with this block. Add the path of this document and the
first step of the next session before saving it.

```prompt
Resume work on Project Name. Run `rule_tool_process_handon` first: it checks which
claims in this handoff still hold before any of them are trusted.
The ADR log and the context snapshot capture what has been decided; do not re-ask
answered questions.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less
message.
```
````

## Usage

```bash
# MCP tool (called by the agent or manually)
> rule_tool_process_handoff { "projectDir": "." }

# CLI
> rule-mcp handoff
# → prints the full handoff block to stdout

# CLI with pipe to clipboard
> rule-mcp handoff | pbcopy    # macOS
> rule-mcp handoff | clip       # Windows
> rule-mcp handoff | xclip      # Linux
```

## Slash command: `/rule-handoff`

`/rule-handoff` runs the handoff directly in the chat. A bare invocation just works and produces a quick `handoff`-mode summary with every include flag on and `compress` off. The command takes a **single free-form `options` argument** of space-separated tokens; the server resolves them into the exact tool arguments, and `/rule-handoff help` prints the usage list without running the tool.

| Token                                                              | Effect                                                                                       |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `handoff` \| `close-session`                                       | Mode (default: `handoff`). `close-session` = full session close (diff + roadmap + docs scan) |
| `compress`                                                         | Aggressively compress the output                                                             |
| `full` \| `brief` \| `minimal`                                     | Output format (default: `full`)                                                              |
| `no-diff` \| `no-log` \| `no-context` \| `no-adrs` \| `no-roadmap` | Omit the corresponding section                                                               |
| `no-archive`                                                       | Render without archiving completed docs or repairing the ADR numbering (read-only run)       |
| `max=<n>`                                                          | Cap output to n tokens (0 = no limit)                                                        |
| `help`                                                             | Print the usage list (no tool call)                                                          |

```
/rule-handoff                                  # all defaults → quick handoff
/rule-handoff help                             # print this list
/rule-handoff close-session                    # full session close
/rule-handoff compress minimal                 # compressed one-line JSON
/rule-handoff brief                            # brief format
/rule-handoff no-diff                          # handoff without the diff
/rule-handoff no-archive                       # diagnose without archiving anything
/rule-handoff close-session no-diff no-log     # close without diff/log
/rule-handoff compress max=2000                # compressed, token-capped
```

When in doubt, just run `/rule-handoff` - the defaults produce a complete handoff you can paste into a new session.

### Atomic commit workflow

When the working tree has **pending changes**, `/rule-handoff` commits them _before_ emitting the handoff, so the next session starts from a clean, well-described history:

1. **Atomic, scoped commits** - changed files are grouped by concern and each group is committed with Conventional Commits **and a mandatory scope** (`type(scope): subject`, e.g. `feat(router): …`, `chore(eslint): …`). The `commit-msg` hook rejects scope-less messages.
2. **Separate docs commit** - handoff and decision documents (ADR, `docs/handoff`, `CHANGELOG`) land in **one final** `docs(handoff): …` / `docs(adr): …` commit, kept apart from the code/config commits.
3. **Never pushes** - every commit stays local for review; the flow does not run `git push`.
4. If the grouping into atomic commits is ambiguous, it asks how to split before committing.

## Resuming a session: where you left off, verified

A handoff is a snapshot of a moment written in the present tense. Three days
later "the fix is on `feat/x`, the suite is green, ADR 045 is pending" may be
wrong in all three clauses, and nothing in the file says so. Pasting it whole
also costs more than the situation warrants: most of a handoff is narrative the
resuming reader already lived.

`rule_tool_process_handon` (CLI `rule-mcp handon`, slash `/rule-handon`)
answers the only two questions that matter on resume: **what is still true, and
what do I do next?**

```bash
rule-mcp handon                 # the newest handoff, verified
rule-mcp handon --list          # what handoffs exist
rule-mcp handon --no-archive    # verify without touching the papers
rule-mcp handon --file docs/handoff/01-token-first-upgrade.md
```

It parses what the handoff claims and checks each claim against the repository
now:

| Claim                   | Reported as                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| Branch                  | `current` / `exists, not checked out` / `merged into main` / `gone` |
| Commit range            | `N commits since`                                                   |
| File in flight          | `unchanged` / `modified since` / `deleted`                          |
| Referenced ADR          | `accepted` / `still proposed` / `not written`                       |
| Open checklist item     | `unverified, human judgement`                                       |
| A command claimed green | `claimed 3 days ago, not re-verified`                               |

Three rules make the answer worth trusting:

- **It never guesses.** "Unverified" is a real answer. "Probably still fine" is
  how a stale handoff does its damage.
- **It never re-runs a claimed command.** That would take minutes and sometimes
  writes files. It reports the claim and its age, and lets you decide.
- **It writes only through the sweep.** Completed audits, reviews and plans
  become ADRs and leave the tree; the `Closeout` section names each one.
  `no-archive` is the pure read, and `list` writes nothing at all.

Output is grouped as **Still true**, **Changed since**, **Unverified**, then
**Closeout** when the sweep archived something, the open items in order, and
**Next from the plans**: a proposal, not a decision. It is the first open step
of every plan that still has one, newest first, for you to confirm before any
work starts. The report ends in one suggested first move that names its reason,
and then in **Prompt to run next** when the handoff carried a `Resume Prompt`: the
block is quoted verbatim, with the file it came from named. A handon longer than
the handoff it read has failed; on this repository's own
handoff it lands at about a quarter of the source.

### What the sweep does

Both `handoff` modes and `handon` archive before they render. A working paper
is complete when a plan carries checks with none open, a review shows a Status
column with no open row, or an audit has a completed review of the same name.
Each finished doc becomes one Nygard ADR, the index is refreshed, the source is
deleted, and the ADR numbering is repaired first so the new ADR cannot land on a
collision. A doc that fails the English gate is skipped and kept, with the
reason reported. The full text stays in git history, and the ADR title carries
the name the document had.

## Recovery Flow

1. **Source session**: Before closing, run `rule-mcp handoff`. The document
   persists to `docs/handoff/<NN>-<slug>.md`, and its closing `Resume Prompt`
   block is what the chat shows - copy the block, which is in the file too.
2. **Target session**: Paste that block as the **first message**, or run
   `rule-mcp handon` if the handoff was persisted: it quotes the same block
   back under `Prompt to run next`.
3. The receiving LLM understands the project, the decisions, and which parts of
   the previous session's account no longer hold

No special tooling on the receiving side - the handoff is a plain-text prompt that any LLM can consume.
---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-process](../rule-process/SKILL.md) - Process skill index
