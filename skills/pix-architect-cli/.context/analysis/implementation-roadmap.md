# Implementation Roadmap (Microtasks with Dependencies)

> **TL;DR**: Work in milestone order, treat each table as the dependency graph for that slice, and flip a milestone to `**[X]**` only after the rows in that section are implemented, tested, and documented.

## How to use this doc

- Follow milestones from top to bottom.
- Use the checkbox under each milestone as the release gate for that dependency slice.
- Read the `Depends on` column as the microtask graph inside each milestone.
- Keep milestones at `[ ]` until implementation, verification, and docs are complete.

All work remains vanilla JS, zero runtime dependencies, Custom Elements v1 without Shadow DOM, Parcel as bundler, and native Web APIs only.

## Delivery principles

- Build thin vertical slices around **[PRIMARY_ENTITY]**, **[SECONDARY_ENTITY]**, and **[DOMAIN_LOGIC_AREA]**.
- Deliver end-to-end user value early through the main flows defined in `qa/checklist.md`.
- Keep domain language synchronized with `specs/02-domain-glossary.md`.
- Verify each milestone against `specs/06-quality-acceptance.md` before expanding scope.

---

## Roadmap by milestone

## Milestone 0 — Product baseline

- [ ] Milestone complete

| Status | ID   | Microtask                                                                                              | Depends on | Deliverable           |
| ------ | ---- | ------------------------------------------------------------------------------------------------------ | ---------- | --------------------- |
| [ ]    | M0.1 | Confirm product frame, glossary, and scope boundaries                                                  | -          | aligned docs baseline |
| [ ]    | M0.2 | Map **[USER_PERSONA]** needs to **[KEY_VALUE_PROP_1]**, **[KEY_VALUE_PROP_2]**, **[KEY_VALUE_PROP_3]** | M0.1       | clear value narrative |
| [ ]    | M0.3 | Freeze MVP scope and non-goals                                                                         | M0.1       | accepted v1 scope     |

## Milestone 1 — Domain foundation

- [ ] Milestone complete

| Status | ID   | Microtask                                                                     | Depends on | Deliverable                       |
| ------ | ---- | ----------------------------------------------------------------------------- | ---------- | --------------------------------- |
| [ ]    | M1.1 | Model **[PRIMARY_ENTITY]**, **[SECONDARY_ENTITY]**, and supporting entities   | M0.3       | stable domain data model          |
| [ ]    | M1.2 | Encode glossary terms **[DOMAIN_TERM_1]** to **[DOMAIN_TERM_5]** in docs/code | M1.1       | shared vocabulary                 |
| [ ]    | M1.3 | Formalize **[DOMAIN_ENTITY_MANAGER]** rules and lifecycle                     | M1.1       | validated reference-data contract |

## Milestone 2 — Primary flows

- [ ] Milestone complete

| Status | ID   | Microtask                                             | Depends on | Deliverable                 |
| ------ | ---- | ----------------------------------------------------- | ---------- | --------------------------- |
| [ ]    | M2.1 | Deliver **[FLOW_1]** through **[PRIMARY_FUNCTION_1]** | M1.3       | first end-to-end user flow  |
| [ ]    | M2.2 | Deliver **[FLOW_2]** through **[PRIMARY_FUNCTION_2]** | M2.1       | second working flow         |
| [ ]    | M2.3 | Deliver **[FLOW_3]** and **[FLOW_4]**                 | M2.2       | core workflow coverage      |
| [ ]    | M2.4 | Align UI states and recovery paths with user stories  | M2.3       | predictable user experience |

## Milestone 3 — Core logic

- [ ] Milestone complete

| Status | ID   | Microtask                                                                      | Depends on | Deliverable                  |
| ------ | ---- | ------------------------------------------------------------------------------ | ---------- | ---------------------------- |
| [ ]    | M3.1 | Implement **[CORE_FUNCTION_1]** and **[CORE_FUNCTION_2]**                      | M2.1       | deterministic business logic |
| [ ]    | M3.2 | Implement **[CORE_FUNCTION_3]** and **[CORE_FUNCTION_4]**                      | M3.1       | broader rules coverage       |
| [ ]    | M3.3 | Implement **[CORE_FUNCTION_5]** and **[CORE_FUNCTION_6]**                      | M3.2       | complete capability surface  |
| [ ]    | M3.4 | Encode **[UNIT_CONVENTION_1]** and **[UNIT_CONVENTION_2]** across the codebase | M3.1       | consistent calculations/data |

## Milestone 4 — Persistence and reference data

- [ ] Milestone complete

| Status | ID   | Microtask                                                      | Depends on | Deliverable                    |
| ------ | ---- | -------------------------------------------------------------- | ---------- | ------------------------------ |
| [ ]    | M4.1 | Persist **[PRIMARY_ENTITY]** and **[SECONDARY_ENTITY]** safely | M3.1       | reliable local data layer      |
| [ ]    | M4.2 | Support creation and validation of **[DOMAIN_ENTITY_MANAGER]** | M1.3       | reusable rules/preset handling |
| [ ]    | M4.3 | Add import, export, and recovery paths where applicable        | M4.1       | safe data portability          |

## Milestone 5 — Quality and hardening

- [ ] Milestone complete

| Status | ID   | Microtask                                                                            | Depends on | Deliverable                 |
| ------ | ---- | ------------------------------------------------------------------------------------ | ---------- | --------------------------- |
| [ ]    | M5.1 | Cover **[EDGE_CASE_1]**, **[EDGE_CASE_2]**, **[EDGE_CASE_3]**, and **[EDGE_CASE_4]** | M3.4       | resilient rule handling     |
| [ ]    | M5.2 | Add automated coverage for **[UNIT_TEST_FOCUS_1]** and **[PROPERTY_TEST_FOCUS_1]**   | M5.1       | regression safety           |
| [ ]    | M5.3 | Validate performance, explainability, robustness, and privacy targets                | M5.2       | ready for acceptance review |
| [ ]    | M5.4 | Verify MVP acceptance steps end to end                                               | M5.3       | release-ready MVP           |

## Key dependency summary

- Product framing before implementation slices
- Domain model and reference data before workflow automation
- Primary flows before hardening and acceptance
- Quality gates before expanding beyond MVP
