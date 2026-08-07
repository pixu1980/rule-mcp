# ROADMAP

> **TL;DR**: Use this file as the checkbox-first roadmap for implementation work, and keep it aligned with `analysis/implementation-roadmap.md` whenever scope or sequencing changes.

## How to use this doc

- Work from the first unchecked milestone downward.
- Treat each checkbox as a dependency-aware microtask gate.
- Keep milestones and microtasks unchecked until implementation, verification, and docs are complete.
- If this file and `analysis/implementation-roadmap.md` diverge, update both in the same branch.

---

## Planning sources

- [project-context.md](./project-context.md)
- [analysis/functional-analysis.md](./analysis/functional-analysis.md)
- [analysis/implementation-roadmap.md](./analysis/implementation-roadmap.md)
- [specs/02-domain-glossary.md](./specs/02-domain-glossary.md)
- [specs/06-quality-acceptance.md](./specs/06-quality-acceptance.md)

## Milestone 0 - Product baseline

- [ ] Milestone complete
- [ ] M0.1 Confirm product frame, glossary, and scope boundaries.
- [ ] M0.2 Map **[USER_PERSONA]** needs to **[KEY_VALUE_PROP_1]**, **[KEY_VALUE_PROP_2]**, and **[KEY_VALUE_PROP_3]**. Depends on: M0.1.
- [ ] M0.3 Freeze MVP scope and non-goals. Depends on: M0.1.

## Milestone 1 - Domain foundation

- [ ] Milestone complete
- [ ] M1.1 Model **[PRIMARY_ENTITY]**, **[SECONDARY_ENTITY]**, and supporting entities. Depends on: M0.3.
- [ ] M1.2 Encode glossary terms **[DOMAIN_TERM_1]** to **[DOMAIN_TERM_5]** in docs and code. Depends on: M1.1.
- [ ] M1.3 Formalize **[DOMAIN_ENTITY_MANAGER]** rules and lifecycle. Depends on: M1.1.

## Milestone 2 - Primary flows

- [ ] Milestone complete
- [ ] M2.1 Deliver **[FLOW_1]** through **[PRIMARY_FUNCTION_1]**. Depends on: M1.3.
- [ ] M2.2 Deliver **[FLOW_2]** through **[PRIMARY_FUNCTION_2]**. Depends on: M2.1.
- [ ] M2.3 Deliver **[FLOW_3]** and **[FLOW_4]**. Depends on: M2.2.
- [ ] M2.4 Align UI states and recovery paths with user stories. Depends on: M2.3.

## Milestone 3 - Core logic

- [ ] Milestone complete
- [ ] M3.1 Implement **[CORE_FUNCTION_1]** and **[CORE_FUNCTION_2]**. Depends on: M2.1.
- [ ] M3.2 Implement **[CORE_FUNCTION_3]** and **[CORE_FUNCTION_4]**. Depends on: M3.1.
- [ ] M3.3 Implement **[CORE_FUNCTION_5]** and **[CORE_FUNCTION_6]**. Depends on: M3.2.
- [ ] M3.4 Encode **[UNIT_CONVENTION_1]** and **[UNIT_CONVENTION_2]** across the codebase. Depends on: M3.1.

## Milestone 4 - Persistence and reference data

- [ ] Milestone complete
- [ ] M4.1 Persist **[PRIMARY_ENTITY]** and **[SECONDARY_ENTITY]** safely. Depends on: M3.1.
- [ ] M4.2 Support creation and validation of **[DOMAIN_ENTITY_MANAGER]**. Depends on: M1.3.
- [ ] M4.3 Add import, export, and recovery paths where applicable. Depends on: M4.1.

## Milestone 5 - Quality and hardening

- [ ] Milestone complete
- [ ] M5.1 Cover **[EDGE_CASE_1]**, **[EDGE_CASE_2]**, **[EDGE_CASE_3]**, and **[EDGE_CASE_4]**. Depends on: M3.4.
- [ ] M5.2 Add automated coverage for **[UNIT_TEST_FOCUS_1]** and **[PROPERTY_TEST_FOCUS_1]**. Depends on: M5.1.
- [ ] M5.3 Validate performance, explainability, robustness, and privacy targets. Depends on: M5.2.
- [ ] M5.4 Verify MVP acceptance steps end to end. Depends on: M5.3.
