# Spec 10: rule Skill and Tool Routing

## Goal

Define how uses the rule skill and MCP tool ecosystem during architecture, implementation, validation, and handoff.

## Primary routing

- Primary skill: **[RULE_MCP_PRIMARY_SKILL]**
- Secondary skills: **[RULE_MCP_SECONDARY_SKILLS]**
- Recommended tools: **[RULE_MCP_RECOMMENDED_TOOLS]**

## Architecture decisions

**[ARCHITECTURE_DECISIONS]**

## Quality gates

**[QUALITY_GATES]**

## Delivery workflow

**[DELIVERY_WORKFLOW]**

## Tool sequence

1. Detect project with `pix_detect`.
2. Route ambiguous work with `rule`.
3. Search skill content with `pix_search`.
4. Generate deterministic templates with `pix_component` or `pix_scaffold`.
5. Validate implementation with `pix_check`.
6. Fix file-tree issues with `pix_fix`.
7. Record decisions with `pix_process_adr`.
8. Handoff with `pix_process_handoff`.
