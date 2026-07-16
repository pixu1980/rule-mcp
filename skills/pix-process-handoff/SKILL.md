---
name: pix-process-handoff
description: >-
  Use when generating a compressed LLM handoff summary for session recovery. Covers ADR logs, project context, and cross-chat continuity.
tags:
  - handoff
  - recovery
  - context
  - transfer
frameworks: [all]
---

# pix-process-handoff — LLM Context Handoff

## Purpose

When an AI-assisted session ends (chat timeout, model switch, context full, human handoff),
**pix-process-handoff** generates a compact prompt that lets a **new LLM session** pick up exactly
where the previous one left off — with zero Q&A to re-establish context.

## Use Cases

| Use Case | When | Why |
|----------|------|-----|
| **Chat recovery** | Browser refresh / timeout / new chat | Paste handoff → continue without re-explaining |
| **Model swap** | Switching GPT → Claude → Gemini mid-task | Handoff normalises context across models |
| **Session handoff** | Hand work to a colleague | A→B: paste handoff, B picks up instantly |

## How It Works

1. `pix-process-handoff` scans the project for:
   - All ADR files in `docs/adr/` — extracts titles, statuses, tags
   - `.context/` files — extracts project values and decisions
   - Project identity from `package.json` or `CONTEXT.md`

2. It compresses everything into a **single prompt block** (≈150–400 lines) that:
   - States the project identity and current state
   - Lists all ADRs with status and key decisions
   - Condenses `.context/` values into a flat key-value table
   - Ends with a handoff instruction for the receiving LLM

3. The output is emitted via the **MCP tool** `pix_process_handoff` or the **CLI** `pix-galaxy-mcp handoff`.

## Output Format

The handoff prompt has four sections:

```
## HANDOFF: Project Name

### Identity
Project type, stack, framework, target.

### ADR Log
001 | accepted | Initial architecture — chose layered pattern
002 | proposed | Database selection — PostgreSQL vs SQLite

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
> pix-galaxy-mcp handoff
# → prints the full handoff block to stdout

# CLI with pipe to clipboard
> pix-galaxy-mcp handoff | pbcopy    # macOS
> pix-galaxy-mcp handoff | clip       # Windows
> pix-galaxy-mcp handoff | xclip      # Linux
```

## Recovery Flow

1. **Source session**: Before closing, run `pix-galaxy-mcp handoff` → copy output
2. **Target session**: Paste the handoff block as the **first message**
3. The receiving LLM immediately understands the project, decisions, and what to do next

No special tooling on the receiving side — the handoff is a plain-text prompt that any LLM can consume.
---

## See also

- [pix](../pix/SKILL.md) — Central skill index and dispatcher
- [pix-process](../pix-process/SKILL.md) — Process skill index
