# Spec 05: Architecture, State, and Data

## Module boundaries

- `src/scripts/core/` contains the pure logic behind **[DOMAIN_LOGIC_AREA]**.
- `src/scripts/app/` coordinates state transitions, orchestration, and user journeys.
- `src/scripts/components/` renders capture, review, and management flows for **[PRIMARY_ENTITY]** and **[SECONDARY_ENTITY]**.
- `src/scripts/data/` owns persistence, migrations, import/export, and **[DOMAIN_ENTITY_MANAGER]** lifecycle concerns.
- `src/scripts/services/` hosts reusable utilities that do not encode business policy.

## Canonical records

- **[PRIMARY_ENTITY]** is the main record the product creates, reviews, or updates.
- **[SECONDARY_ENTITY]** supports classification, grouping, policy selection, or enrichment.
- **[DOMAIN_ENTITY_MANAGER]** stores reusable rules, presets, or reference data.
- Supporting records may be based on **[ENTITY_1]**, **[ENTITY_2]**, **[ENTITY_3]**, and **[ENTITY_4]** when the domain needs them.

## Persistence principles

- Prefer local-first storage with stable identifiers and explicit migrations.
- Preserve revision metadata where it helps auditing, explainability, or recovery.
- Keep data contracts aligned with **[DOMAIN_DATA_PRINCIPLE_1]**.
- Apply **[UNIT_CONVENTION_1]** and **[UNIT_CONVENTION_2]** consistently across capture, storage, and derived outputs.

## Workflow contracts

- The product must support these core flows:
  - **[FLOW_1]**
  - **[FLOW_2]**
  - **[FLOW_3]**
  - **[FLOW_4]**
- The UI must cover the main screens and surfaces described in **[LIST_PRIMARY_SCREENS_AND_FEATURES]**.
- Functional areas map to:
  - **[PRIMARY_FUNCTION_1]**: **[PRIMARY_FUNCTION_1_DESC]**
  - **[PRIMARY_FUNCTION_2]**: **[PRIMARY_FUNCTION_2_DESC]**
  - **[PRIMARY_FUNCTION_3]**: **[PRIMARY_FUNCTION_3_DESC]**
  - **[PRIMARY_FUNCTION_4]**: **[PRIMARY_FUNCTION_4_DESC]**
- State changes must be explicit, reversible when possible, and understandable to users.

## Error handling and recovery

- Validate before mutation or import.
- Prevent partial failures from leaving **[PRIMARY_ENTITY]** or **[SECONDARY_ENTITY]** in inconsistent states.
- Provide recovery paths for invalid data, outdated rules, and interrupted saves.
- Keep destructive actions explicit and reversible where practical.
