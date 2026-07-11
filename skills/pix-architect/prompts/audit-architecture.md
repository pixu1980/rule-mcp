# Audit Architecture Documentation

Review the project's architecture documentation for completeness and consistency.

## Check

1. **`.context/` completeness**
   - Are all 7 spec docs present? (00-sdd through 06-quality)
   - Do all docs have clear goals and scope?
   - Are there any unfilled `[PLACEHOLDER]` values?
   - Is the domain glossary complete?

2. **`.agents/` completeness**
   - Are instructions present for each domain (coding, testing, docs)?
   - Do prompt templates cover all workflow phases?
   - Are skills properly registered?
   - Is `AGENTS.md` present with golden rules?

3. **Cross-reference consistency**
   - Do specs reference each other correctly?
   - Are terms used consistently across docs?
   - Do architecture decisions match the actual code?

4. **Quality gates**
   - Are acceptance criteria testable?
   - Are non-goals explicit?
   - Are technical constraints documented?
   - Are open questions flagged?

## Output

- List of missing or incomplete items
- Suggested fixes
- Priority order
