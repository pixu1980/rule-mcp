---
name: rule-architect-web
description: >-
  Use when running the architect wizard as a web interface. Covers browser-based project scaffolding.
tags:
  - "architecture"
  - "wizard"
  - "web"
  - "interview"
  - "context"
frameworks: [vanilla-reactive]
---

# rule-architect-web — Browser Interview Shell

Thin rendering shell for the rule-architect engine. Reads `wizard-spec.json`
from `../rule-architect/` and renders the 25-step interview wizard in a browser.

## Architecture

```
rule-architect-web/          ← this skill
├── server.mjs              ← HTTP server, serves API + static files
├── index.html              ← SPA entry point
├── interview.js            ← reactive wizard (Store + Signal + html``)
├── interview.css            ← rule-styleguide compliant styling
└── core/                   ← vanilla-reactive engine
    ├── signals/            ← Signal, State, Computed, Effect
    ├── store/              ← Proxy-based reactive store
    └── template-engine/    ← html`` tagged templates, directives
```

## How to start

```bash
cd skills/rule-architect-web
node server.mjs . --port 3000
```

Open `http://localhost:3000`.

## API endpoints

| Method | Path                | Description                                                 |
| ------ | ------------------- | ----------------------------------------------------------- |
| `GET`  | `/api/wizard-spec`  | Returns wizard-spec.json from rule-architect engine          |
| `GET`  | `/api/placeholders` | Backward compat — wizard-spec wrapped as placeholders shape |
| `GET`  | `/api/templates`    | Template list with placeholder counts                       |
| `GET`  | `/api/init-values`  | Detect project values to pre-fill the interview             |
| `POST` | `/api/generate`     | Write .context/ to disk, returns file list                  |
| `POST` | `/api/download`     | Returns file contents as JSON (no disk write)               |

## How it works

1. `server.mjs` loads `wizard-spec.json` from `../rule-architect/`
2. `interview.js` fetches `/api/wizard-spec` and renders steps as cards
3. User fills 0-25 steps, clicking cards for selects, typing for text
4. Phase 1 (Domain Sketch) pre-fills Phase 3 (Domain Deep-Dive)
5. Submit → .context/ written to disk

## Dependencies

Zero npm dependencies. Uses vanilla-reactive engine bundled in `core/`.

## See also

- [rule-architect](../rule-architect/SKILL.md) — The engine
- [rule-architect-cli](../rule-architect-cli/SKILL.md) — Terminal alternative
