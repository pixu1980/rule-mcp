# Project Scaffold Checklist

## Phase 1: Agent Infrastructure

- [ ] Create `.agents/` directory
- [ ] Create `AGENTS.md` with golden rules, where to look, workflow
- [ ] Create `AI_WORKFLOW.md` with Spec → Plan → Implement → Test → Docs → PR
- [ ] Create `REPO_MAP.md` with full repository structure

### instructions/

- [ ] `repo.instructions.md` — branching, CI/CD, conventions
- [ ] `coding.instructions.md` — code style, architecture, naming
- [ ] `testing.instructions.md` — testing strategy, coverage targets
- [ ] `docs.instructions.md` — documentation standards
- [ ] `frontend.instructions.md` — UI-specific (if applicable)
- [ ] `backend.instructions.md` — API-specific (if applicable)

### prompts/

- [ ] `feature-spec.prompt.md` — requirements structure
- [ ] `implementation-plan.prompt.md` — task breakdown
- [ ] `plan-and-slice.prompt.md` — independent increments
- [ ] `implement-task.prompt.md` — execute one task
- [ ] `write-tests.prompt.md` — test generation
- [ ] `fill-context-all.prompt.md` — batch context fill
- [ ] `fill-context-analysis.prompt.md` — analysis section
- [ ] `fill-context-qa.prompt.md` — QA section
- [ ] `fill-context-schemas.prompt.md` — schemas section
- [ ] `fill-context-specs.prompt.md` — specs section
- [ ] `commit-message.prompt.md` — commit message format
- [ ] `pr-description.prompt.md` — PR description format

### skills/

- [ ] `README.md` — skill catalog
- [ ] Individual rule-* skills as needed

### styleguides/

- [ ] `html.md` — semantic HTML, accessibility
- [ ] `css.md` — classless selectors, data-part
- [ ] `javascript.md` — ES modules, JSDoc
- [ ] `json.md` — JSON structure
- [ ] `markdown.md` — documentation formatting

### assistants/

- [ ] `claude-code.md` — Claude Code guidance
- [ ] `cursor.md` — Cursor editor rules
- [ ] `copilot.md` — GitHub Copilot instructions
- [ ] `codex.md` — OpenAI Codex guidance

## Phase 2: Context Generation CLI

- [ ] Create `cli/` directory
- [ ] `cli/package.json` with dependencies
- [ ] `cli/cli.js` — main CLI entry point
- [ ] `cli/.context/` — template directory
- [ ] Template files with `[PLACEHOLDER]` placeholders
- [ ] Placeholder data files (examples, patterns, order, info)
- [ ] `cli/_apply-values.js` — template filling logic
- [ ] `cli/_formatters.js` — output formatting
- [ ] `cli/_placeholder-ops.js` — placeholder operations
- [ ] `cli/_prompts.js` — interactive prompts

## Phase 3: Spec Documents

- [ ] `00-sdd.md` — Spec-Driven Development foundation
- [ ] `01-product.md` — Product vision
- [ ] `02-domain-glossary.md` — Domain terms
- [ ] `03-calculation-engine.md` — Business logic
- [ ] `04-ruleset-config.md` — Configuration
- [ ] `05-architecture-ui-storage.md` — Architecture
- [ ] `06-quality-acceptance.md` — Quality acceptance

## Phase 4: Supporting Files

- [ ] `cli/.context/analysis/functional-analysis.md`
- [ ] `cli/.context/analysis/implementation-roadmap.md`
- [ ] `cli/.context/qa/checklist.md`
- [ ] `cli/.context/schemas/ruleset.schema.json`
- [ ] `cli/.context/constraints.concrete.md`
- [ ] `cli/.context/use-cases.concrete.md`
- [ ] `cli/.context/ROADMAP.md`
- [ ] `cli/.context/README.md`
- [ ] `cli/.context/TEMPLATE_GUIDE.md`

## Phase 5: Tool Configs

- [ ] `.cursor/rules/` — Cursor rules (00-repo, 10-coding, 20-testing, 30-docs)
- [ ] `.claude/settings.json` — Claude Code settings
- [ ] `.github/copilot-instructions.md` — Copilot instructions
- [ ] Symlinks: `.agents/copilot/` → `.github/`, `.agents/cursor/` → `.cursor/`, `.agents/claude/` → `.claude/`

## Phase 6: Generate & Validate

- [ ] Run `node cli/cli.js` to generate initial `.context/`
- [ ] Verify no `[UNFILLED]` placeholders remain
- [ ] Run `node .agents/scripts/generate-skills-context.js` to update `SKILLS_CONTEXT.xml`
- [ ] Run validation scripts
- [ ] All guardrails pass
