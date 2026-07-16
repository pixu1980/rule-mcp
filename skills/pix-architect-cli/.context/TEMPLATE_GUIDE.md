# Context Templates Guide

This folder contains generic, reusable templates for project documentation. The template set is intentionally small and centered on product framing, domain vocabulary, rules, workflows, and quality.

## Folder Structure

- **ROADMAP.md** — Checkbox-first milestone tracker aligned with the implementation roadmap

### `/analysis/`

- **functional-analysis.md** — Product value, users, scope, capabilities, and open questions
- **implementation-roadmap.md** — Delivery milestones and dependency order

### `/specs/`

Seven Spec-Driven Development spec files:

- **00-sdd.md** — Spec Driven Development principles and delivery process
- **01-product.md** — Product vision, personas, user stories, and non-goals
- **02-domain-glossary.md** — Domain glossary and core entities
- **03-calculation-engine.md** — Core domain logic, constraints, and edge cases
- **04-ruleset-config.md** — Reusable rules, reference data, and validation
- **05-architecture-ui-storage.md** — Architecture, state, persistence, and workflow contracts
- **06-quality-acceptance.md** — Quality requirements, testing strategy, acceptance criteria

### `/schemas/`

- **ruleset.schema.json** — JSON Schema template for validating reusable rules and reference data

### `/qa/`

- **checklist.md** — Manual QA checklist for testing flows

## How to Use Templates

When starting a new project:

1. **Copy the `context/` folder** into your new repository
2. **Replace all placeholders** following the `PLACEHOLDER_NAME` pattern
3. **Preserve one shared vocabulary** across analysis, specs, schema, and QA notes
4. **Adapt content** to your specific domain

### Example: Transforming a Generic App Project

```
 → "Project Tracker"
**[USER_PERSONA]** → "Team member tracking tasks"
**[CORE_FUNCTION_1]** → "Create and organize records"
**[ENTITY_1]** → "Record" (with date, status, category, notes)
```

## Common Placeholders

### Single placeholders

- `` — Project name
- `` — One-sentence description of the product outcome
- `**[PROJECT_ELEVATOR_PITCH]**` — Short vision statement
- `**[PROJECT_DISCLAIMER]**` — Constraints, legal framing, or implementation disclaimer
- `**[DOMAIN_NAME]**` — Problem space or business area
- `**[DOMAIN_ENTITY_MANAGER]**` — Reusable rules, policy, preset, or reference-data container
- `**[PRIMARY_ENTITY]**` — Main entity
- `**[SECONDARY_ENTITY]**` — Secondary entity
- `**[USER_PERSONA]**` — Primary user profile
- `**[CONTEXT_AND_OBJECTIVE]**` — Short problem statement
- `**[LIST_PRIMARY_SCREENS_AND_FEATURES]**` — Main surfaces and what users do there
- `**[DOMAIN_LOGIC_AREA]**` — Core business-logic focus

### Numbered groups

- `[KEY_VALUE_PROP_*]` — Core user value propositions
- `[USER_NEED_*]` and `[ADVANCED_USER_NEED_*]` — Primary and advanced user needs
- `[PERSONA_*]` and `[PERSONA_*_DESC]` — Persona labels and descriptions
- `[USER_STORY_*]` — User stories
- `[FEATURE_*]` — Feature areas
- `[SCOPE_ITEM_*]`, `[OUT_OF_SCOPE_ITEM_*]`, `[NON_GOAL_*]` — Scope boundaries
- `[PRIMARY_FUNCTION_*]` and `[CORE_FUNCTION_*]` — Main product areas and concrete capabilities
- `[DOMAIN_TERM_*]` and `[ENTITY_*]` — Shared vocabulary and data concepts
- `[DOMAIN_CONSTRAINT_*]`, `[DOMAIN_NOTE_*]`, `[DOMAIN_SPECIFIC_ASSUMPTION_*]` — Rule framing
- `[DOMAIN_UX_REQUIREMENT_*]`, `[DOMAIN_DATA_PRINCIPLE_*]`, `[UNIT_CONVENTION_*]` — Product requirements
- `[EDGE_CASE_*]`, `[EDGE_CASE_TEST_*]`, `[FLOW_*]` — Operational coverage
- `[PERF_TARGET_*]`, `[ROBUSTNESS_REQ_*]`, `[EXPLAIN_REQ_*]`, `[PRIVACY_REQ_*]` — Quality goals
- `[UNIT_TEST_FOCUS_*]`, `[PROPERTY_TEST_FOCUS_*]`, `[MVP_STEP_*]`, `[OPEN_QUESTION_*]` — Verification and planning

## Core Principles Maintained

These templates maintain:

- ✅ Zero runtime dependencies (vanilla JS ES6+)
- ✅ Custom Elements v1 without Shadow DOM
- ✅ Modular and scalable architecture
- ✅ Local-first persistence when appropriate
- ✅ Spec-Driven Development methodology
- ✅ Accessibility-first (semantics, keyboard navigation, ARIA)
- ✅ Progressive enhancement

## Critical Notes

- Maintaining folder structure helps agents navigate the project
- Spec files are interdependent (00→01→02→03→04→05→06)
- Functional analysis should precede implementation roadmap
- Schema and QA files should be updated whenever rules or flows change

## Example Usage Flow

1. **Start with functional-analysis.md:**

   ```
    = "WorkflowPro"
   **[USER_PERSONA]** = "Operations manager"
   **[CORE_FUNCTION_1]** = "Create and track workflow items"
   **[CORE_FUNCTION_2]** = "Generate progress reports"
   **[CORE_FUNCTION_3]** = "Validate workflow rules"
   ```

2. **Define domain in specs:**

   ```
   Spec 02: **[DOMAIN_TERM_1]** = "Workflow Item"
            **[ENTITY_1]** = "Item"
            **[ENTITY_2]** = "Stage"

   Spec 03: **[DOMAIN_CONSTRAINT_1]** = "A closed item cannot move back to draft without explicit reopen action"
            **[EDGE_CASE_1]** = "Imported items missing an owner"

   Spec 04: **[DOMAIN_ENTITY_MANAGER]** = "Workflow policy"
            **[UNIT_CONVENTION_1]** = "Scores are stored as integers from 0 to 100"
   ```

3. **Build architecture per specs:**

   ```
   Spec 05: **[PRIMARY_ENTITY]** = "Item"
            **[SECONDARY_ENTITY]** = "Stage"
            **[FLOW_1]** = "Create a workflow item and assign its first stage"
   ```

4. **Validate implementation:**

   ```
   Spec 06: **[MVP_STEP_1]** = "Create a single workflow item"
            **[MVP_STEP_2]** = "Generate a progress report"
            **[MVP_STEP_3]** = "Export reports"
   ```
