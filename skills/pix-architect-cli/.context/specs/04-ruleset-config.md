# Spec 04: Domain Rules and Reference Data

## Goal

**[DOMAIN_ENTITY_MANAGER]** defines the reusable rules, presets, or policy data that keep  consistent across workflows.

## Required shape

Each **[DOMAIN_ENTITY_MANAGER]** should capture at minimum:

- Product context aligned with **[DOMAIN_NAME]**, **[PRIMARY_ENTITY]**, and **[SECONDARY_ENTITY]**
- Glossary anchors for **[DOMAIN_TERM_1]**, **[DOMAIN_TERM_2]**, **[DOMAIN_TERM_3]**, **[DOMAIN_TERM_4]**, and **[DOMAIN_TERM_5]**
- Entity definitions for **[ENTITY_1]**, **[ENTITY_2]**, **[ENTITY_3]**, and **[ENTITY_4]**
- Rule constraints including **[DOMAIN_CONSTRAINT_1]** and **[DOMAIN_CONSTRAINT_2]**
- Operational notes such as **[DOMAIN_NOTE_1]**, **[DOMAIN_NOTE_2]**, **[DOMAIN_NOTE_3]**, and **[DOMAIN_NOTE_4]**
- Assumptions such as **[DOMAIN_SPECIFIC_ASSUMPTION_1]**, **[DOMAIN_SPECIFIC_ASSUMPTION_2]**, and **[DOMAIN_SPECIFIC_ASSUMPTION_3]**
- Data and unit conventions such as **[DOMAIN_DATA_PRINCIPLE_1]**, **[UNIT_CONVENTION_1]**, and **[UNIT_CONVENTION_2]**

## Validation

- JSON Schema in `../schemas/ruleset.schema.json`
- Runtime validation before applying or activating a **[DOMAIN_ENTITY_MANAGER]**
- If invalid: block the operation and display a readable error with the failing field or rule

## Lifecycle

- Create or revise a **[DOMAIN_ENTITY_MANAGER]** intentionally, never implicitly
- Keep revision notes when rules or assumptions change
- Import and export only when the product benefits from portability or auditability
- Changes to a manager must not silently mutate existing **[PRIMARY_ENTITY]** records without confirmation

## UX implications

- Surface the active **[DOMAIN_ENTITY_MANAGER]** clearly in user-facing copy
- Explain how rules influence **[PRIMARY_ENTITY]** and **[SECONDARY_ENTITY]** decisions
- Keep manager operations aligned with **[DOMAIN_UX_REQUIREMENT_1]**
