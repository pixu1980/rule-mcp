# Spec 00: Spec Driven Development (SDD)

## Goal

These specs must be sufficient for Copilot and other assistants to implement in iterations without ambiguity. Each module must include:

- Scope and non-scope
- Target users and value
- Domain vocabulary, rules, and edge cases
- Interfaces (user flows, pure functions, reference data, and validation rules)
- Acceptance criteria and minimum tests

## Delivery process

1. Implement in small vertical slices that connect **[USER_PERSONA]** needs to **[DOMAIN_LOGIC_AREA]**.
2. Data and pure functions first, then orchestration, then UI.
3. Each PR must include:
   - Automated coverage for **[UNIT_TEST_FOCUS_1]**
   - Verification against at least one manual flow in `../qa/checklist.md`

## Project constraints

- Vanilla JS runtime, 0 dependencies
- Parcel for build
- Custom Elements v1, NO Shadow DOM, NO template tags
- Offline-first where it reduces user risk
- **[DOMAIN_CONSTRAINT_1]**
- **[DOMAIN_CONSTRAINT_2]**

## Domain notes

**[DOMAIN_NOTE_1]**
**[DOMAIN_NOTE_2]**
**[DOMAIN_NOTE_3]**
**[DOMAIN_NOTE_4]**

## Disclaimer

**[PROJECT_DISCLAIMER]**
