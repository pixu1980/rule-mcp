# rule-architect — 3-Skill Architecture & Wizard Reborn

> **Author**: Architecture Review — 30+ years perspective  
> **Status**: Design phase  
> **Goal**: `rule-architect` engine + `rule-architect-cli` shell + `rule-architect-web` shell. One spec, two surfaces, zero drift.

---

## 0. Why 3 Skills

```
rule-architect        ← engine: wizard-spec.json, templates.json, generator, SKILL.md
rule-architect-cli    ← shell:  opentui CLI, reads wizard-spec from rule-architect, renders TUI
rule-architect-web    ← shell:  vanilla JS Web, reads wizard-spec from rule-architect, renders DOM
```

| Role | `rule-architect` | `rule-architect-cli` | `rule-architect-web` |
|------|:--:|:--:|:--:|
| wizard-spec.json source of truth | ✅ | — | — |
| templates.json (.context/ output) | ✅ | — | — |
| generator engine | ✅ | — | — |
| showIf/validation logic | ✅ (shared) | ✅ (copy for offline) | ✅ (JS clone) |
| optionGroups (all skills) | ✅ | — | — |
| SKILL.md (routing, docs) | ✅ | — | — |
| CLI rendering (opentui) | — | ✅ | — |
| Web rendering (vanilla JS) | — | — | ✅ |
| HTTP server (context-server.mjs) | — | — | ✅ |
| prefillMap logic | ✅ | ✅ | ✅ |

**Rule**: `rule-architect` holds ALL shared data. CLI and Web are thin renderers. No logic duplicated — only display code.

---

## 1. Architectural Philosophy

### Domain + Tech in parallel

| Iteration | What | Why |
|---|---|---|
| **Sketch** | Domain sketch (5 fields, 2 min) | Informs tech choices without analysis paralysis |
| **Lock** | Technology Stack (10 cond. steps) | Chosen with domain context. Now locked. |
| **Deepen** | Domain Deep-Dive (6 steps, pre-filled) | Confident tech can support domain |
| **Harden** | Quality & Delivery (8 steps) | Both domain and tech known → precise choices |

> Domain drives tech, but tech constrains domain. Sketch first → choose tech → deepen domain → harden everything.

---

## 2. New Flow: 25 Steps, 5 Phases

```
PHASE 0 — CONTEXT           starter  1 step
├─ 0.  Analysis Depth

PHASE 1 — DOMAIN SKETCH     starter  1 step
├─ 1.  Domain Sketch (name, pitch, 3 features, persona, 5 terms)

PHASE 2 — TECHNOLOGY STACK  starter  10 steps
├─ 2.  Project Type & Platform        ← rule-platform-*
├─ 3.  Frontend Framework             ← rule-frontend-*
├─ 4.  Meta / SSR Framework           ← rule-frontend-meta-*
├─ 5.  Desktop Framework              ← rule-platform-desktop
├─ 6.  Backend / API Framework        ← rule-backend-*
├─ 7.  Database Engine                ← rule-data-*
├─ 8.  API Style                      ← rule-backend-api-design
├─ 9.  Architecture Pattern           ← rule-architect
├─ 10. CSS / Design System            ← rule-styleguide-* / rule-ui-*
├─ 11. Package Manager + Linter       ← rule-toolchain-*

PHASE 3 — DOMAIN DEEP-DIVE  standard  6 steps
├─ 12. Project Identity              (pre-filled from sketch)
├─ 13. Domain Glossary               (pre-filled from sketch)
├─ 14. Entities & Data Model
├─ 15. Personas                      (primary pre-filled from sketch)
├─ 16. Features, Flows, User Stories (features pre-filled from sketch)
├─ 17. Scope & MVP

PHASE 4 — QUALITY & DELIVERY deep      8 steps
├─ 18. Module Design
├─ 19. Integration Points
├─ 20. Quality, Testing, A11y
├─ 21. Security & Compliance
├─ 22. Deployment & Environments
├─ 23. DevOps & Toolchain
├─ 24. Process & Delivery
├─ 25. rule Skills & MCP Routing       (auto-generated table)
```

### Pre-fill from Sketch (Phase 1 → Phase 3)

| Sketch field | Auto-populates | Phase 3 step |
|---|---|---|
| `PROJECT_NAME_SKETCH` | `PROJECT_NAME` | Step 12 |
| `PROJECT_PITCH_SKETCH` | `PROJECT_ELEVATOR_PITCH` | Step 12 |
| `TOP_FEATURE_1,2,3` | `FEATURES` array | Step 16 |
| `PRIMARY_PERSONA` | `PERSONA_1` | Step 15 |
| `DOMAIN_TERMS_RAW` | `DOMAIN_TERMS` array | Step 13 |

---

## 3. File Structure (post-reborn)

```
skills/
├── rule-architect/                    ← ENGINE: concentrator, shared logic
│   ├── SKILL.md                      ← routing: when to use, how CLI/Web connect
│   ├── wizard-spec.json              ← SINGLE SOURCE OF TRUTH: 25 steps, 5 phases, all optionGroups, prefillMap
│   ├── templates.json                ← .context/ output templates (23 files)
│   ├── generator.mjs                 ← .context/ generation engine (used by both CLI and Web)
│   ├── validators.mjs                ← showIf logic + required field checks (used by both)
│   ├── knowledge/                    ← architecture docs, plans, inventory
│   │   ├── wizard-reborn-plan.md
│   │   ├── context-inventory.md
│   │   └── ...
│   ├── prompts/                      ← audit + scaffold prompts
│   └── examples/                     ← example .context/ outputs
│
├── rule-architect-cli/                ← SHELL: opentui terminal surface
│   ├── SKILL.md                      ← CLI-specific: commands, flags, examples
│   ├── wizard.mjs                    ← entry point: reads ../rule-architect/wizard-spec.json
│   ├── renderer.mjs                  ← opentui components: cards, inputs, selects, repeatable
│   └── package.json                  ← dependency: opentui, + rule-architect (symlink or workspace)
│
└── rule-architect-web/                ← SHELL: vanilla JS browser surface
    ├── SKILL.md                      ← Web-specific: server start, API endpoints, browser support
    ├── server.mjs                    ← HTTP server (was context-server.mjs)
    ├── index.html                    ← SPA entry
    ├── interview.js                  ← reactive wizard (Store + Signal + html``)
    ├── interview.css                 ← rule-styleguide compliant styling
    └── core/                         ← vanilla-reactive engine (signals, store, template)
```

### Data flow

```
rule-architect/wizard-spec.json
        │
        ├──→ rule-architect-cli/wizard.mjs (reads via ../rule-architect/)
        │       └── opentui renders each step, collects answers
        │
        ├──→ rule-architect-web/server.mjs (serves via /api/wizard-spec)
        │       └── interview.js fetches, renders, collects answers
        │
        └──→ rule-architect/generator.mjs (reads wizard-spec + collected answers)
                └── writes .context/ files to disk
```

---

## 4. wizard-spec.json — Single Source of Truth

```jsonc
{
  "$schema": "./wizard-spec.schema.json",
  "version": "2.0",
  "phases": [
    { "key": "context",  "label": "Context",            "tier": "starter",  "order": 0 },
    { "key": "sketch",   "label": "Domain Sketch",      "tier": "starter",  "order": 1 },
    { "key": "tech",     "label": "Technology Stack",   "tier": "starter",  "order": 2 },
    { "key": "domain",   "label": "Domain Deep-Dive",   "tier": "standard", "order": 3 },
    { "key": "quality",  "label": "Quality & Delivery", "tier": "deep",     "order": 4 }
  ],
  "steps": [
    {
      "key": "step-1-sketch",
      "phase": "sketch",
      "tier": "starter",
      "label": "Step 1 — Domain Sketch",
      "description": "Quick context to inform technology choices.",
      "fields": [ /* ... */ ]
    }
  ],
  "optionGroups": {
    "projectTypes": [ /* ... */ ],
    "frontendFrameworks": [ /* ... */ ]
  },
  "prefillMap": {
    "PROJECT_NAME": { "from": "PROJECT_NAME_SKETCH" },
    "PROJECT_ELEVATOR_PITCH": { "from": "PROJECT_PITCH_SKETCH" }
  }
}
```

### Key: step order IS the array order. No separate config.

### Validation contract

- Steps are rendered in array order
- Steps tagged with `phase` beyond current `tier` are hidden
- `showIf` controls field visibility within each step (array, negation, compound)
- `prefillMap` auto-populates from earlier steps whenever user navigates forward

---

## 5. `rule-architect` — The Engine (concentrator)

### SKILL.md roles

- **Orchestrator**: tells agent when to use CLI vs Web
- **Wizard spec**: documents `wizard-spec.json` structure
- **Skill map**: maps every interview choice to the exact rule skill
- **Output contract**: defines what `.context/` files are generated
- **CLI/Web references**: `[rule-architect-cli](../rule-architect-cli/SKILL.md)`, `[rule-architect-web](../rule-architect-web/SKILL.md)`

### MCP tool: `pix_architect`

Modes beyond `full/guardrails/check/search`:
- `wizard-spec` → returns wizard-spec.json to agent
- `generate` → accepts answers JSON, returns generated .context/ preview
- `validate` → checks answers against wizard-spec schema

### Shared modules

```
generator.mjs     → read wizard-spec + answers → write .context/
validators.mjs    → showIf(step, values) → boolean, isRequired(field) → boolean
prefill.mjs       → apply prefillMap to values from earlier steps
```

---

## 6. `rule-architect-cli` — The Terminal Surface

### SKILL.md roles

- **Install**: `pnpm add opentui`
- **Commands**: `rule-architect interview [--tier] [--output] [--answers]`
- **Card rendering**: opentui Select with Title + Description + Skill tag
- **Navigation**: ← → arrow keys, Enter to confirm, Ctrl+C to quit
- **Data source**: reads `../rule-architect/wizard-spec.json`

### MCP tool: `pix_architect_cli`

- `interview` → start CLI interview mode (launches opentui process)

### CLI command API

```bash
# Starter: sketch + tech + identity (12 steps)
rule-architect interview --tier starter

# Standard: + domain deep-dive (18 steps)
rule-architect interview --tier standard

# Deep: + quality & delivery (25 steps)
rule-architect interview --tier deep

# Resume from saved state
rule-architect interview --answers ./state.json --tier standard

# Output to specific directory
rule-architect interview --output ./my-project
```

---

## 7. `rule-architect-web` — The Browser Surface

### SKILL.md roles

- **Start**: `node server.mjs [--port 3000] [target-dir]`
- **Zero deps**: vanilla JS, Custom Elements v1, adoptedStyleSheets
- **API endpoints**: `/api/wizard-spec`, `/api/init-values`, `/api/generate`, `/api/download`
- **Reactive engine**: Store + Signal + html`` + render() from vanilla-reactive

### MCP tool: `pix_architect_web`

- `serve` → start HTTP server with default port
- `generate` → accepts answers JSON via POST, returns generated files preview

### Server API

```
GET  /api/wizard-spec      → returns wizard-spec.json
GET  /api/init-values      → detects project values to pre-fill
POST /api/generate         → writes .context/ to disk, returns file list
POST /api/download         → returns file contents as JSON (no disk write)
```

### What stays the same

- Zero deps vanilla JS
- `skill-card` unified card CSS with `aspect-ratio: auto`
- `card-grid` flex layout, `min-width: 140px`, max 4 per row
- `showIf` with array/negation/compound support
- Pix styleguide compliance: no CSS classes, semantic HTML, data-part selectors

### What changes

| Current | New |
|---|---|
| `assets/context-server/placeholders.json` (embedded) | `../rule-architect/wizard-spec.json` (shared) |
| `sections` from store | `steps` from wizard-spec |
| No prefill between steps | `prefillMap` logic on step advance |
| 18 steps | 25 steps (Phase 1 added, rest reorganized) |
| Templates embedded in server | Templates from `../rule-architect/templates.json` |

---

## 8. Prefill Map

When Phase 1 completes, `prefillMap` auto-populates Phase 3 fields:

```javascript
// In rule-architect/validators.mjs
function applyPrefill(values, wizardSpec) {
  const map = wizardSpec.prefillMap || {};
  const result = { ...values };
  for (const [targetKey, rule] of Object.entries(map)) {
    if (!result[targetKey] || rule.override) {
      if (typeof rule.from === 'string') {
        result[targetKey] = values[rule.from] || '';
      } else if (rule.transform === 'featuresFromSketch') {
        result[targetKey] = values.TOP_FEATURES || [];
      } else if (rule.transform === 'personaFromSketch') {
        result[targetKey] = [{
          name: values.PRIMARY_PERSONA || '',
          description: '',
          goal: '',
          pain: '',
          behavior: ''
        }];
      } else if (rule.transform === 'termsFromSketch') {
        const lines = (values.DOMAIN_TERMS_RAW || '').split('\n').filter(Boolean);
        result[targetKey] = lines.map(line => ({ term: line, definition: '' }));
      }
    }
  }
  return result;
}
```

---

## 9. Card Contract (all 3 skills, all surfaces)

Every card MUST render:

```
┌─────────────────────┐
│ Title (bold, accent)│
│                     │
│ Description         │
│ (muted, smaller)    │
│                     │
│ ┌─────────────────┐ │
│ │ rule-skill-name  │ │  ← skill tag (if present)
│ └─────────────────┘ │
└─────────────────────┘
```

Data contract for every option in every optionGroup:

```jsonc
{
  "key": "react",
  "label": "React 18+",                         // Title
  "description": "Functional components...",     // Description
  "build": "Vite",                               // Subtle mono text (optional)
  "pixAISkill": "rule-frontend-react"         // Skill tag (if empty, not shown)
}
```

---

## 10. Implementation Plan

### Milestone 1: Extract engine (`rule-architect`) — 2h

- [ ] Create `skills/rule-architect/wizard-spec.json` from current placeholders.json
- [ ] Add Phase 1 — Domain Sketch (step 1) with 5 prefill fields
- [ ] Move `templates.json` to `rule-architect/templates.json`
- [ ] Create `rule-architect/generator.mjs` (extract from context-server.mjs)
- [ ] Create `rule-architect/validators.mjs` (showIf, required, prefill)
- [ ] Update `rule-architect/SKILL.md` — document 3-skill architecture, spec, API
- [ ] Renumber all steps: 0-25 with new Phase 1 insertion

### Milestone 2: Extract web (`rule-architect-web`) — 2h

- [ ] Create `skills/rule-architect-web/SKILL.md`
- [ ] Move `assets/context-server/` content to `rule-architect-web/`
- [ ] Update `server.mjs` to read `wizard-spec.json` from `../rule-architect/`
- [ ] Update `interview.js` to read from `/api/wizard-spec`
- [ ] Update `loadData()` to handle new 25-step structure
- [ ] Add Phase 1 rendering (Domain Sketch)
- [ ] Test: `node server.mjs --port 3000 .` — all 25 steps appear

### Milestone 3: Create CLI (`rule-architect-cli`) — 3h

- [ ] Create `skills/rule-architect-cli/SKILL.md`
- [ ] Install opentui: `pnpm add opentui` in workspace
- [ ] Create `rule-architect-cli/wizard.mjs` — opentui multi-step form
- [ ] Create `rule-architect-cli/renderer.mjs` — card components for each field type
- [ ] Implement showIf + card rendering parity with Web
- [ ] Add `--tier`, `--output`, `--answers` flags
- [ ] Test: `rule-architect interview --tier starter` — 12 steps in terminal

### Milestone 4: Parity verification — 2h

- [ ] Web: check all 25 steps render with correct showIf and card format
- [ ] CLI: check all card renders (Title + Desc + Skill tag) match Web
- [ ] Both: same `wizard-spec.json` → same step order, same tier filtering
- [ ] Both: same answers → byte-identical `.context/` output
- [ ] Edge cases: "none" options, required fields, Ctrl+C in CLI

---

## 11. Quality Gates

- [ ] `wizard-spec.json` valid JSON — all 25 steps, 5 phases, all optionGroups
- [ ] Every `[PLACEHOLDER]` in templates matches a wizard-spec field
- [ ] CLI and Web produce identical `.context/` from identical answers
- [ ] Empty options (`none`, `manual`) don't render empty cards
- [ ] opentui CLI handles Ctrl+C gracefully (no orphaned state)
- [ ] Web `showIf` handles array + negation + compound
- [ ] Cards always show: Title + Description + Skill tag (hidden if empty)
- [ ] `rule-architect` SKILL.md documents the 3-skill architecture
- [ ] `rule-architect-cli` SKILL.md documents CLI commands and opentui integration
- [ ] `rule-architect-web` SKILL.md documents server API and browser support
