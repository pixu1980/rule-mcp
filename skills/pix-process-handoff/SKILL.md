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
   - Ends with a handoff instruction for the receiving LLM

3. The output is emitted via the **MCP tool** `rule_tool_process_handoff` or the **CLI** `rule-mcp handoff`.

## Output Format

The handoff prompt has four sections:

```
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

### Handoff Instruction
[Instruction for the receiving LLM to continue the work]
```

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
| `max=<n>`                                                          | Cap output to n tokens (0 = no limit)                                                        |
| `help`                                                             | Print the usage list (no tool call)                                                          |

```
/rule-handoff                                  # all defaults → quick handoff
/rule-handoff help                             # print this list
/rule-handoff close-session                    # full session close
/rule-handoff compress minimal                 # compressed one-line JSON
/rule-handoff brief                            # brief format
/rule-handoff no-diff                          # handoff without the diff
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
later "the fix is on `feat/x`, the suite is green, ADR 046 is pending" may be
wrong in all three clauses, and nothing in the file says so. Pasting it whole
also costs more than the situation warrants: most of a handoff is narrative the
resuming reader already lived.

`rule_tool_process_handon` (CLI `rule-mcp handon`, slash `/rule-handon`)
answers the only two questions that matter on resume: **what is still true, and
what do I do next?**

```bash
rule-mcp handon                 # the newest handoff, verified
rule-mcp handon --list          # what handoffs exist
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

- **Read-only.** No checkout, no stash, no write. Git plumbing that reports.
- **It never re-runs a claimed command.** That would take minutes and sometimes
  writes files. It reports the claim and its age, and lets you decide.
- **It never guesses.** "Unverified" is a real answer. "Probably still fine" is
  how a stale handoff does its damage.

Output is grouped as **Still true**, **Changed since**, **Unverified**, and the
open items in order, ending in one suggested first move that names its reason. A
handon longer than the handoff it read has failed; on this repository's own
handoff it lands at about a quarter of the source.

## Recovery Flow

1. **Source session**: Before closing, run `rule-mcp handoff` -> copy output
2. **Target session**: Paste the handoff block as the **first message**, or run
   `rule-mcp handon` if the handoff was persisted to `docs/handoff/`
3. The receiving LLM understands the project, the decisions, and which parts of
   the previous session's account no longer hold

No special tooling on the receiving side - the handoff is a plain-text prompt that any LLM can consume.
---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-process](../rule-process/SKILL.md) - Process skill index
