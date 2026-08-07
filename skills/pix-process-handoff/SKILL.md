---
name: rule-process-handoff
description: >-
  Use when generating a compressed LLM handoff summary for session recovery. Covers ADR logs, project context, and cross-chat continuity.
tags:
  - handoff
  - recovery
  - context
  - transfer
frameworks: [all]
---

# rule-process-handoff - LLM Context Handoff

## Purpose

When an AI-assisted session ends (chat timeout, model switch, context full, human handoff),
**rule-process-handoff** generates a compact prompt that lets a **new LLM session** pick up exactly
where the previous one left off - with zero Q&A to re-establish context.

## Use Cases

| Use Case            | When                                     | Why                                            |
| ------------------- | ---------------------------------------- | ---------------------------------------------- |
| **Chat recovery**   | Browser refresh / timeout / new chat     | Paste handoff → continue without re-explaining |
| **Model swap**      | Switching GPT → Claude → Gemini mid-task | Handoff normalises context across models       |
| **Session handoff** | Hand work to a colleague                 | A→B: paste handoff, B picks up instantly       |

## How It Works

1. `rule-process-handoff` scans the project for:
   - All ADR files in `docs/adr/` - extracts titles, statuses, tags
   - `.context/` files - extracts project values and decisions
   - Project identity from `package.json` or `CONTEXT.md`

2. It compresses everything into a **single prompt block** (≈150–400 lines) that:
   - States the project identity and current state
   - Lists all ADRs with status and key decisions
   - Condenses `.context/` values into a flat key-value table
   - Ends with a handoff instruction for the receiving LLM

3. The output is emitted via the **MCP tool** `pix_process_handoff` or the **CLI** `rule-mcp handoff`.

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
> pix_process_handoff { "projectDir": "." }

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

## Recovery Flow

1. **Source session**: Before closing, run `rule-mcp handoff` → copy output
2. **Target session**: Paste the handoff block as the **first message**
3. The receiving LLM immediately understands the project, decisions, and what to do next

No special tooling on the receiving side - the handoff is a plain-text prompt that any LLM can consume.
---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-process](../rule-process/SKILL.md) - Process skill index
