---
name: rule-process-bmad
description: >-
  Use when following the BMad structured delivery method. Covers 4-phase workflow (analysis, planning, solution, implementation) with agent-guided execution.
tags:
  - "bmad"
  - "method"
  - "workflow"
  - "planning"
  - "architecture"
  - "implementation"
  - "ai-agents"
  - "agile"
  - "development-framework"
frameworks: [all]
---

# rule-process-bmad — BMAD Method Framework

The **BMad Method** (Build More Architect Dreams) is an AI-driven development framework for building software through the whole process from ideation and planning all the way through agentic implementation. It provides specialized AI agents, guided workflows, and intelligent planning that adapts to your project's complexity.

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [Planning Tracks](#2-planning-tracks)
3. [Installation](#3-installation)
4. [Phase 1: Analysis (Optional)](#4-phase-1-analysis-optional)
5. [Phase 2: Planning](#5-phase-2-planning)
6. [Phase 3: Solutioning](#6-phase-3-solutioning)
7. [Phase 4: Implementation](#7-phase-4-implementation)
8. [Quick Flow (Parallel Track)](#8-quick-flow-parallel-track)
9. [Agents](#9-agents)
10. [Context Management](#10-context-management)
11. [Customization](#11-customization)

---

## 1. Core Concepts

### Phases

The BMAD Method structures software delivery into four phases:

| Phase | Name           | Status    | What Happens                                                       |
| ----- | -------------- | --------- | ------------------------------------------------------------------ |
| 1     | Analysis       | Optional  | Brainstorming, research, forge idea, product brief or PRFAQ        |
| 2     | Planning       | Required  | Create requirements: PRD, UX, SPEC                                 |
| 3     | Solutioning    | Required* | Design architecture spine or detailed project/system architectures |
| 4     | Implementation | Required  | Build epic by epic, story by story                                 |

_\*Required for BMad Method and Enterprise tracks. Quick Flow skips to implementation._

### Workflows

Each phase contains one or more **workflows** — named, invocable skills executed in an AI IDE:

```
bmad-prd                     → Create/update/validate a PRD
bmad-create-architecture     → Create architecture document
bmad-dev-story               → Implement a single story
bmad-code-review             → Quality validation
...
```

Workflows are invoked by name in any AI IDE (Claude Code, Cursor, Codex CLI, etc.).

### BMad-Help

**BMad-Help** is the intelligent guide that knows what to do next. It inspects your project, detects what's been completed, installed modules, and recommends the next action. Invoke it at any time:

```
bmad-help
bmad-help I have a SaaS idea, where do I start?
```

BMad-Help automatically runs at the end of every workflow to tell you what to do next.

### Fresh Chats

Every workflow runs in a **fresh chat**. This prevents context window limitations from causing issues and ensures agents start with clean, focused context.

---

## 2. Planning Tracks

Based on project complexity, choose one of three tracks:

| Track           | Best For                                               | Docs Created                           | Phases                                                   |
| --------------- | ------------------------------------------------------ | -------------------------------------- | -------------------------------------------------------- |
| **Quick Flow**  | Bug fixes, simple features, clear scope (1-15 stories) | Tech-spec only                         | Planning → Implementation (single workflow)              |
| **BMad Method** | Products, platforms, complex features (10-50+ stories) | PRD + Architecture + UX                | Analysis (opt) → Planning → Solutioning → Implementation |
| **Enterprise**  | Compliance, multi-tenant systems (30+ stories)         | PRD + Architecture + Security + DevOps | Analysis (opt) → Planning → Solutioning → Implementation |

_Story counts are guidance, not definitions. Choose based on planning needs, not story math._

---

## 3. Installation

### Prerequisites

- **Node.js 20.12+** — Required for the installer
- **Git** — Recommended for version control
- **AI-powered IDE** — Claude Code, Cursor, Codex CLI, or similar

### Install

```bash
# Latest stable
pnpx bmad-method install

# Prerelease
pnpx bmad-method@next install
```

When prompted, select **BMad Method** module.

### Project structure after installation

```
your-project/
├── _bmad/                           # BMad configuration
│   ├── agents/                      # Agent definitions
│   ├── workflows/                   # Workflow definitions
│   ├── tasks/                       # Task configurations
│   ├── scripts/                     # Resolution scripts
│   └── custom/                      # Custom overrides (empty by default)
├── _bmad-output/                    # Generated artifacts
│   ├── planning-artifacts/
│   │   ├── PRD.md
│   │   ├── architecture.md
│   │   └── epics/
│   ├── implementation-artifacts/
│   │   └── sprint-status.yaml
│   └── project-context.md
└── ...
```

### First step after install

```bash
bmad-help
```

BMad-Help detects what's installed and guides you to the right starting point.

---

## 4. Phase 1: Analysis (Optional)

Explore the problem space and validate ideas before committing to planning.

### Workflows

| Workflow                  | Purpose                                                        | Produces                                                     |
| ------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| `bmad-brainstorming`      | Brainstorm project ideas with guided facilitation              | `brainstorm.html` keepsake + optional `brainstorm-intent.md` |
| `bmad-forge-idea`         | Pressure-test an idea until it hardens or dies cheaply         | `forge-report.html` + `forged-idea.md` when hardened         |
| `bmad-domain-research`    | Validate domain assumptions                                    | Research findings                                            |
| `bmad-market-research`    | Validate market assumptions                                    | Research findings                                            |
| `bmad-technical-research` | Validate technical assumptions                                 | Research findings                                            |
| `bmad-product-brief`      | Capture strategic vision (concept is clear)                    | `brief.md` + `addendum.md` + optional HTML/presentation      |
| `bmad-prfaq`              | Working Backwards — stress-test product concept customer-first | `prfaq-{project}.md`                                         |

### When to use each

- **Not sure which to use?** → Ask `bmad-help`
- **Pure ideation** → `bmad-brainstorming`
- **Validate an idea cheaply** → `bmad-forge-idea`
- **Clear concept** → `bmad-product-brief`
- **Customer-first validation** → `bmad-prfaq`
- **Specific research needed** → pick the research workflow

---

## 5. Phase 2: Planning

Define what to build and for whom. **Required** for BMad Method and Enterprise tracks.

### Workflows

| Workflow   | Purpose                                  | Produces                                                                                           |
| ---------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `bmad-prd` | Create, update, or validate a PRD        | Create/Update: `prd.md` + `addendum.md` + `.memlog.md`. Validate: `validation-report.html` + `.md` |
| `bmad-ux`  | Design user experience (when UX matters) | `DESIGN.md` (visual) + `EXPERIENCE.md` (behavioral) spine pair + `.memlog.md`                      |

### bmad-prd intents

The PRD workflow has three intents:

| Intent       | Use case                                                                        |
| ------------ | ------------------------------------------------------------------------------- |
| **Create**   | Coached discovery from scratch — names the workspace folder and guides to a PRD |
| **Update**   | Point at existing PRD + change signal — surfaces conflicts before applying      |
| **Validate** | Critique a finished PRD against a checklist — produces HTML findings report     |

### UX Design (optional)

If the project has a user interface, invoke the **UX-Designer agent** (`bmad-agent-ux-designer`) and run `bmad-ux` after creating the PRD.

### Quick Flow alternative

For simple features and bug fixes, skip directly to `bmad-quick-dev` — handles planning and implementation in a single workflow.

---

## 6. Phase 3: Solutioning

Decide how to build it and break work into stories. **Required** for BMad Method and Enterprise tracks.

### Workflows

| Workflow                              | Purpose                                    | Produces                                             |
| ------------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| `bmad-create-architecture`            | Make technical decisions explicit          | `ARCHITECTURE-SPINE.md` (default) or hydrated output |
| `bmad-create-epics-and-stories`       | Break requirements into implementable work | Epic files with stories                              |
| `bmad-check-implementation-readiness` | Gate check before implementation           | PASS / CONCERNS / FAIL decision                      |

### Order

1. **Architecture first** (BMad Method v6+): invoke `bmad-agent-architect`, run `bmad-create-architecture`
2. **Epics and stories after architecture**: invoke `bmad-agent-pm`, run `bmad-create-epics-and-stories`
3. **Readiness check** (recommended): invoke `bmad-agent-architect`, run `bmad-check-implementation-readiness`

Architecture before epics produces better quality stories because architecture decisions (database, API patterns, tech stack) directly affect how work should be broken down.

---

## 7. Phase 4: Implementation

Build it, one story at a time.

### Sprint initialization

Invoke `bmad-agent-dev` and run `bmad-sprint-planning` to create `sprint-status.yaml`.

### The build cycle

For each story, repeat with fresh chats:

| Step | Agent | Workflow            | Command             | Purpose                          |
| ---- | ----- | ------------------- | ------------------- | -------------------------------- |
| 1    | DEV   | `bmad-create-story` | `bmad-create-story` | Create story file from epic      |
| 2    | DEV   | `bmad-dev-story`    | `bmad-dev-story`    | Implement the story              |
| 3    | DEV   | `bmad-code-review`  | `bmad-code-review`  | Quality validation (recommended) |

After completing all stories in an epic: invoke `bmad-agent-dev`, run `bmad-retrospective`.

### Additional workflows

| Workflow              | Purpose                                | Produces                   |
| --------------------- | -------------------------------------- | -------------------------- |
| `bmad-correct-course` | Handle significant mid-sprint changes  | Updated plan or re-routing |
| `bmad-sprint-status`  | Track sprint progress and story status | Sprint status update       |
| `bmad-retrospective`  | Review after epic completion           | Lessons learned            |

---

## 8. Quick Flow (Parallel Track)

Skip phases 1-3 for small, well-understood work.

| Workflow         | Purpose                                                         | Produces           |
| ---------------- | --------------------------------------------------------------- | ------------------ |
| `bmad-quick-dev` | Unified flow — clarify intent, plan, implement, review, present | `spec-*.md` + code |
| `bmad-dev-auto`  | One unattended dev-loop iteration — small intent in, code out   | `spec-*.md` + code |

---

## 9. Agents

BMad provides specialized agents. Each has a distinct persona, communication style, and set of workflows.

| Agent           | Skill                    | Role                                     | When to Use                     |
| --------------- | ------------------------ | ---------------------------------------- | ------------------------------- |
| **Analyst**     | `bmad-agent-analyst`     | Research, brainstorming, domain analysis | Phase 1 analysis workflows      |
| **PM**          | `bmad-agent-pm`          | Product discovery, PRD, requirements     | Phase 2 planning, epics/stories |
| **UX Designer** | `bmad-agent-ux-designer` | User experience, visual design           | After PRD, before architecture  |
| **Architect**   | `bmad-agent-architect`   | Technical decisions, architecture        | Phase 3 solutioning, readiness  |
| **Developer**   | `bmad-agent-dev`         | Implementation, coding, review           | Phase 4 implementation          |

Agents are invoked directly in the AI IDE:

```
bmad-agent-architect
```

Then run a workflow within the agent's context:

```
bmad-create-architecture
```

### Agent customization surface

Every skill ships a `customize.toml` with its customizable fields:

| Field                            | Shape            | Rule            | Example                           |
| -------------------------------- | ---------------- | --------------- | --------------------------------- |
| `agent.icon`                     | scalar           | override wins   | `"🏥"`                            |
| `agent.role`                     | scalar           | override wins   | `"Drives product discovery"`      |
| `agent.communication_style`      | scalar           | override wins   | `"Precise, regulatory-aware"`     |
| `agent.persistent_facts`         | array of strings | append          | `"Our org is AWS-only"`           |
| `agent.principles`               | array of strings | append          | `"Ship nothing that fails audit"` |
| `agent.activation_steps_prepend` | array of strings | append          | runs before greet                 |
| `agent.activation_steps_append`  | array of strings | append          | runs after greet                  |
| `agent.menu`                     | array of tables  | merge by `code` | menu items                        |

See the [Customization](#11-customization) section for the three-layer override model.

---

## 10. Context Management

Each document becomes context for the next phase. The PRD tells the architect what constraints matter. The architecture tells the dev agent which patterns to follow. Story files give focused, complete context for implementation.

### Context flow

```
Analysis docs (opt) → PRD → Architecture → Epics & Stories → Code
```

Without this structure, agents make inconsistent decisions across sessions.

### project-context.md

An optional file at `_bmad-output/project-context.md` that documents:

- Technology stack and conventions
- Implementation rules
- Coding standards

**How to create it:**

- **Manually**: write `_bmad-output/project-context.md`
- **Generate**: run `bmad-generate-project-context` (Analyst agent) after architecture

---

## 11. Customization

### Three-layer override model

Every skill can be customized without modifying installed files. Customizations survive updates.

| Priority | File                                  | Scope                | Git        |
| -------- | ------------------------------------- | -------------------- | ---------- |
| 1 (wins) | `_bmad/custom/{skill-name}.user.toml` | Personal preferences | gitignored |
| 2        | `_bmad/custom/{skill-name}.toml`      | Team/org overrides   | committed  |
| 3 (last) | `skill's own customize.toml`          | Defaults             | shipped    |

### Merge rules

| Shape                                          | Rule                                               |
| ---------------------------------------------- | -------------------------------------------------- |
| Scalar (string, int, bool, float)              | Override wins                                      |
| Table                                          | Deep merge (recursive)                             |
| Array of tables with same `code` or `id` field | Merge by that key — matching replaces, new appends |
| Any other array                                | Append (base, team, user)                          |

### Customization helper

Use `bmad-customize` for a guided authoring experience:

```
bmad-customize
```

It scans what's customizable, helps choose the right surface (agent vs workflow), writes the override file, and verifies the merge landed.

### Resolution

On activation, the agent's SKILL.md runs:

```bash
uv run {project-root}/_bmad/scripts/resolve_customization.py \
  --skill {skill-root} \
  --key agent
```

Requires Python 3.11+ (stdlib `tomllib` only — no pip dependencies).

---

## Quick Reference: All Workflows

| Workflow                 | Command                               | Agent       | Phase | Purpose                          |
| ------------------------ | ------------------------------------- | ----------- | ----- | -------------------------------- |
| **BMad-Help** ⭐         | `bmad-help`                           | Any         | —     | Intelligent guide — ask anything |
| Brainstorming            | `bmad-brainstorming`                  | Analyst     | 1     | Guided ideation                  |
| Forge Idea               | `bmad-forge-idea`                     | Analyst     | 1     | Pressure-test an idea            |
| Domain Research          | `bmad-domain-research`                | Analyst     | 1     | Domain assumptions               |
| Market Research          | `bmad-market-research`                | Analyst     | 1     | Market assumptions               |
| Technical Research       | `bmad-technical-research`             | Analyst     | 1     | Technical assumptions            |
| Product Brief            | `bmad-product-brief`                  | Analyst     | 1     | Strategic vision                 |
| PRFAQ                    | `bmad-prfaq`                          | Analyst     | 1     | Working Backwards                |
| PRD                      | `bmad-prd`                            | Any         | 2     | Create/update/validate PRD       |
| UX Design                | `bmad-ux`                             | UX Designer | 2     | User experience design           |
| Architecture             | `bmad-create-architecture`            | Architect   | 3     | Technical decisions              |
| Epics & Stories          | `bmad-create-epics-and-stories`       | PM          | 3     | Break down requirements          |
| Readiness Check          | `bmad-check-implementation-readiness` | Architect   | 3     | Gate check                       |
| Sprint Planning          | `bmad-sprint-planning`                | DEV         | 4     | Initialize tracking              |
| Create Story             | `bmad-create-story`                   | DEV         | 4     | Prepare next story               |
| Dev Story                | `bmad-dev-story`                      | DEV         | 4     | Implement a story                |
| Code Review              | `bmad-code-review`                    | DEV         | 4     | Quality validation               |
| Correct Course           | `bmad-correct-course`                 | DEV         | 4     | Mid-sprint changes               |
| Sprint Status            | `bmad-sprint-status`                  | DEV         | 4     | Track progress                   |
| Retrospective            | `bmad-retrospective`                  | DEV         | 4     | Lessons learned                  |
| Quick Dev                | `bmad-quick-dev`                      | DEV         | 2-4   | Unified quick flow               |
| Dev Auto                 | `bmad-dev-auto`                       | DEV         | 2-4   | Unattended dev loop              |
| Generate Project Context | `bmad-generate-project-context`       | Analyst     | —     | Auto-generate context            |
| Customize                | `bmad-customize`                      | —           | —     | Guided customization             |

---

## See also

- [rule](../rule/SKILL.md) — Central skill index and dispatcher
- [rule-process](../rule-process/SKILL.md) — Process skill index
