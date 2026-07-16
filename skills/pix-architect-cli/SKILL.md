---
name: pix-architect-cli
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

# pix-architect-cli — Terminal Interview Shell

Thin rendering shell for the pix-architect engine. Reads `wizard-spec.json`
from `../pix-architect/` and renders the 25-step interview wizard in a terminal.

## Architecture

```
pix-architect-cli/          ← this skill
├── wizard.mjs              ← entry point: opentui multi-step form
├── renderer.mjs            ← card/input rendering for opentui
└── package.json            ← dependency: opentui
```

## How to start

```bash
cd skills/pix-architect-cli
node wizard.mjs --tier starter --output ./my-project
```

## Commands

```bash
# Starter: Domain Sketch + Tech Stack + Identity (12 steps)
pix-architect interview --tier starter

# Standard: + Domain Deep-Dive (18 steps)
pix-architect interview --tier standard

# Deep: + Quality & Delivery (25 steps)
pix-architect interview --tier deep

# Resume from saved state
pix-architect interview --answers ./state.json

# Output to specific directory
pix-architect interview --output ./my-project
```

## Card rendering

Every select field renders as an opentui card with:

```
┌─────────────────────┐
│ Title (bold)        │
│ Description (muted) │
│ [pix-skill-name]    │  ← skill tag
└─────────────────────┘
```

Navigation: ← → arrow keys, Enter to confirm, Ctrl+C to quit.

## Dependencies

- `opentui` — terminal UI toolkit (https://opentui.com)
- `../pix-architect/wizard-spec.json` — interview spec
- `../pix-architect/validators.mjs` — showIf + prefill logic
- `../pix-architect/generator.mjs` — .context/ generation

## See also

- [pix-architect](../pix-architect/SKILL.md) — The engine
- [pix-architect-web](../pix-architect-web/SKILL.md) — Browser alternative
