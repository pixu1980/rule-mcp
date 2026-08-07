---
name: rule-architect-cli
description: >-
  Use when running the architect wizard from a terminal. Covers CLI-based project scaffolding and context generation.
tags:
  - "architecture"
  - "wizard"
  - "cli"
  - "tui"
  - "interview"
  - "context"
frameworks: [node, agents]
---

# rule-architect-cli - Terminal Interview Shell

Thin rendering shell for the rule-architect engine. Reads `wizard-spec.json`
from `../rule-architect/` and renders the 25-step interview wizard in a terminal.

## Architecture

```
rule-architect-cli/          ← this skill
├── wizard.mjs              ← entry point: opentui multi-step form
├── renderer.mjs            ← card/input rendering for opentui
└── package.json            ← dependency: opentui
```

## How to start

```bash
cd skills/rule-architect-cli
node wizard.mjs --tier starter --output ./my-project
```

## Commands

```bash
# Starter: Domain Sketch + Tech Stack + Identity (12 steps)
rule-architect interview --tier starter

# Standard: + Domain Deep-Dive (18 steps)
rule-architect interview --tier standard

# Deep: + Quality & Delivery (25 steps)
rule-architect interview --tier deep

# Resume from saved state
rule-architect interview --answers ./state.json

# Output to specific directory
rule-architect interview --output ./my-project
```

## Card rendering

Every select field renders as an opentui card with:

```
┌─────────────────────┐
│ Title (bold)        │
│ Description (muted) │
│ [rule-skill-name]    │  ← skill tag
└─────────────────────┘
```

Navigation: ← → arrow keys, Enter to confirm, Ctrl+C to quit.

## Dependencies

- `opentui` - terminal UI toolkit (https://opentui.com)
- `../rule-architect/wizard-spec.json` - interview spec
- `../rule-architect/validators.mjs` - showIf + prefill logic
- `../rule-architect/generator.mjs` - .context/ generation

## See also

- [rule-architect](../rule-architect/SKILL.md) - The engine
- [rule-architect-web](../rule-architect-web/SKILL.md) - Browser alternative
