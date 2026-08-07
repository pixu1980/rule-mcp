---
name: rule-process-adr
description: >-
  Use when recording architecture decisions. Covers auto-numbered ADRs with Nygard template, searchable index, and chronological ordering.
tags:
  - architecture
  - documentation
  - decisions
  - adr
frameworks: [all]
---

# rule-process-adr - Architecture Decision Records

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
- **Author**: rule-architect

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

### MCP Tool: `pix_process_adr`

```json
{
  "title": "Usare PostgreSQL",
  "status": "accepted",
  "context": "Il progetto richiede JOIN complessi",
  "decision": "Useremo PostgreSQL 16",
  "consequences": "Positive: integrità referenziale. Negative: scaling orizzontale",
  "alternatives": ["MongoDB: scartato per mancanza relazioni"],
  "tags": ["database"]
}
```

### CLI: `rule-mcp adr new <title> [--status]`

## Directory Structure

```
docs/adr/
├── README.md                    # Indice cronologico
├── 001-initial-architecture.md
├── 002-database-selection.md
└── 003-api-design.md
```

## Status Flow

```
proposed → accepted → deprecated
                ↓
          superseded (by new ADR)
```

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-process](../rule-process/SKILL.md) - Process skill index
