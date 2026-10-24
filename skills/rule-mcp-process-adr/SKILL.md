---
name: rule-mcp-process-adr
description: >-
  Use when recording architecture decisions. Covers auto-numbered ADRs with Nygard template, searchable index, and chronological ordering.
tags:
  - architecture
  - documentation
  - decisions
  - adr
frameworks: [all]
---

# rule-mcp-process-adr - Architecture Decision Records

## Purpose

Capture every architectural decision with context, rationale, and consequences.
ADRs live in `docs/adr/` and are **immutable once accepted** - superseded decisions
get a new ADR that references the old one.

## Format

Every ADR follows the [Michael Nygard template](https://github.com/joelparkerhenderson/architecture-decision-record):

```markdown
# NNN: Title

- **Date**: YYYY-MM-DD
- **Status**: proposed | accepted | deprecated | superseded
- **Tags**: tag1, tag2
- **Author**: rule-mcp

## Context

What forcing factors led to this decision?

## Decision

What was decided and why.

## Consequences

### Positive

### Negative

## Alternatives Considered

1. **Alternative A** - Why not chosen
2. **Alternative B** - Why not chosen
```

## Tools

### MCP Tool: `rule_tool_process_adr`

```json
{
  "title": "Usare PostgreSQL",
  "status": "accepted",
  "context": "The project requires complex JOINs",
  "decision": "We will use PostgreSQL 16",
  "consequences": "Positive: referential integrity. Negative: horizontal scaling",
  "alternatives": ["MongoDB: rejected for lack of relations"],
  "tags": ["database"]
}
```

### CLI: `rule-mcp adr new <title> [--status]`

## Directory Structure

```
docs/adr/
├── ADR.md                       # generated: index, one-liners, themes, rules
├── 001-initial-architecture.md
├── 002-database-selection.md
└── 003-api-design.md
```

`ADR.md` is the only index and nobody edits it. Every column in it is read back
out of the numbered files, so the way to correct the index is to correct the
ADR and let the next `rule_tool_process_adr` call rewrite it. There is no second
summary to keep in sync: there was one, and it went stale ten decisions before
anybody noticed.

## Status Flow

```
proposed → accepted → deprecated
                ↓
          superseded (by new ADR)
```

---

## See also

- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index and dispatcher
- [rule-mcp-process](../rule-mcp-process/SKILL.md) - Process skill index
