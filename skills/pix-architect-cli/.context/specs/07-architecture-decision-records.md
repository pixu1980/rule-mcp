# Spec 07: Architecture Decision Records (ADRs)

## Goal

Track significant architectural decisions with their context, rationale, and consequences. ADRs ensure that future developers (including AI agents) understand why the system is built the way it is.

## ADR Location

**[ADR_LOCATION]**

## Active ADRs

### ADR 1: **[ADR_1]**

- **Context**: **[ADR_1_CONTEXT]**
- **Decision**: **[ADR_1_DECISION]**
- **Rationale**: **[ADR_1_RATIONALE]**
- **Consequences**: **[ADR_1_CONSEQUENCES]**

### ADR 2: **[ADR_2]**

- **Context**: **[ADR_2_CONTEXT]**
- **Decision**: **[ADR_2_DECISION]**
- **Rationale**: **[ADR_2_RATIONALE]**
- **Consequences**: **[ADR_2_CONSEQUENCES]**

## ADR Template

When documenting a new decision, use:

```markdown
# ADR **[NN]**: [Title]

## Context

What is the problem or opportunity?

## Decision

What was decided?

## Rationale

Why was this chosen over alternatives?

## Consequences

What does this mean for the codebase, team, or users?

## Alternatives Considered

- Option A: pros/cons
- Option B: pros/cons
```

## When to write an ADR

- Introducing a new dependency or framework
- Choosing a storage mechanism
- Changing the module/package structure
- Adding a significant feature that affects architecture
- Changing the build or deployment pipeline
- Any decision with irreversible consequences

## References

- Referenced by Spec 05 (Architecture) for module boundaries
- Referenced by Spec 08 (Deployment) for infrastructure decisions
- Team convention: ADRs are immutable once accepted (new ADR supersedes old)
