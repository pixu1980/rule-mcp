# Spec-Driven Development (SDD) Writer Guide

## Purpose

SDD ensures that every project has a complete, consistent set of specifications that are sufficient for AI agents and human developers to implement features without ambiguity.

## The 7 Specs

### Spec 00 — SDD Foundation
**Goal**: Define the development approach and project guardrails.

Key sections:
- Scope and non-scope
- Target users and value
- Domain vocabulary, rules, edge cases
- Delivery process: small vertical slices
- Project constraints (tech stack, 0 deps, build tool)
- Acceptance criteria and minimum tests

When writing, be explicit about:
- What is in scope and what is explicitly out
- The technical constraints (why vanilla JS, why no Shadow DOM, etc.)
- How delivery works (iterations, PR flow)

### Spec 01 — Product Vision
**Goal**: Paint a clear picture of what the product is and who it serves.

Key sections:
- Elevator pitch (one sentence)
- Key features (top 3-5)
- Personas with descriptions
- Primary user stories
- Non-goals for v1

When writing:
- Personas should be specific, not generic ("Busy freelancer" not "User")
- User stories follow "As [persona], I want [goal]"
- Non-goals prevent scope creep

### Spec 02 — Domain Glossary
**Goal**: Establish a shared vocabulary.

Key sections:
- Core entities with definitions
- Domain terms with explanations
- Entity relationships

When writing:
- Every term used in other specs should be defined here
- Be precise about what each term means in THIS domain
- Include examples when the term is abstract

### Spec 03 — Business Logic
**Goal**: Document all domain calculations, rules, and algorithms.

Key sections:
- Business rules (if-then constraints)
- Calculation/formula logic
- Validation rules
- Input/output contracts

When writing:
- Rules should be testable (pass/fail criteria)
- Edge cases should be explicit
- Don't assume knowledge — write for someone new to the domain

### Spec 04 — Configuration
**Goal**: Document what users can configure and how.

Key sections:
- Configuration schemas
- Preset management
- User-configurable parameters

When writing:
- Include both shape (JSON schema) and behavior (what each config does)
- Document default values
- Explain which configs affect which features

### Spec 05 — Architecture & Data
**Goal**: Define how the system is structured and how data flows.

Key sections:
- Module boundaries and responsibilities
- Canonical records and entities
- Persistence principles
- Workflow contracts
- Error handling and recovery

When writing:
- Module boundaries should map one-to-one with reasons to change
- Workflow contracts describe what happens, not how
- Error handling should cover recovery paths

### Spec 06 — Quality & Acceptance
**Goal**: Define what "done" means.

Key sections:
- Non-functional requirements (performance, robustness, explainability, privacy)
- Testing strategy (unit, integration, E2E, manual)
- MVP acceptance criteria
- Open questions

When writing:
- Acceptance criteria must be testable (not "feels fast" but "renders in <100ms")
- Testing strategy should be realistic for the team size
- Open questions should block nothing but flag uncertainty

## Cross-Reference Rules

- Spec 01 references: Spec 02 (terms), Spec 03 (business rules)
- Spec 02 references: Spec 01 (personas), Spec 05 (entities as data)
- Spec 03 references: Spec 02 (domain terms), Spec 04 (config affecting rules)
- Spec 04 references: Spec 02 (domain terms), Spec 05 (persistence)
- Spec 05 references: Spec 01 (features), Spec 03 (logic areas), Spec 06 (quality)
- Spec 06 references: All other specs

## Writing Checklist

For each spec document:
- [ ] Has a clear goal/scope statement
- [ ] Uses terms defined in Spec 02 consistently
- [ ] Avoids implementation details (focus on WHAT, not HOW)
- [ ] Is testable or verifiable
- [ ] References related specs where relevant
- [ ] No ambiguous language ("should", "might", "could" without context)
- [ ] Lists open questions explicitly when uncertain

## Quality Gates

Before accepting a spec set:
- [ ] All 7 specs present and complete
- [ ] No placeholder text remaining
- [ ] All domain terms used consistently
- [ ] Specs reference each other with correct cross-references
- [ ] Acceptance criteria are measurable
- [ ] Personas are specific, not generic
- [ ] Non-goals are explicit
- [ ] Technical constraints are documented
- [ ] Edge cases are covered
