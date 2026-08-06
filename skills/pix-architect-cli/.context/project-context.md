---
name: " Context"
description: Quick context on the product frame, domain language, and implementation rules.
---

Use these rules when working in this repository:

- is a **[DOMAIN_NAME]** product designed to .
- Core working context: **[CONTEXT_AND_OBJECTIVE]**
- The main records are **[PRIMARY_ENTITY]** with supporting **[SECONDARY_ENTITY]**.
- **[DOMAIN_ENTITY_MANAGER]** captures reusable reference rules, presets, or policy data when the product needs them.
- Keep implementation aligned with the main logic area: **[DOMAIN_LOGIC_AREA]**.
- Vanilla JS ES6+ with zero runtime dependencies.
- UI built with Custom Elements v1 using light DOM (no Shadow DOM).
- No `<template>` or `<slot>`; use `this.innerHTML`.
- CSS inside `render()` via a dynamically created `<style>` tag added with `this.prepend(style)`.
- Entry points: `src/index.html` (Parcel) and `src/scripts/index.js` (app bootstrap).
- Services in `src/scripts/services/` (templateEngine, stylesheetService, etc.).
- App logic in `src/scripts/app/` handles state transitions, orchestration, and user flows.
- Styles in `src/styles/` with `@layer` for cascade management.
- Avoid runtime libraries like React, Vue, Tailwind, Lodash.
- Preserve glossary terms for **[PRIMARY_ENTITY]**, **[SECONDARY_ENTITY]**, and the domain vocabulary defined in `specs/02-domain-glossary.md`.
- Recheck `analysis/functional-analysis.md` and `specs/06-quality-acceptance.md` before changing rules, flows, or product behavior.
- Always consult `../.agents/styleguides/` for HTML/CSS/JS conventions before making changes.

- Primary rule skill: **[RULE_MCP_PRIMARY_SKILL]**.
- Supporting skills: **[RULE_MCP_SECONDARY_SKILLS]**.
- Use MCP tools in this order when applicable: **[RULE_MCP_RECOMMENDED_TOOLS]**.
- Quality gates: **[QUALITY_GATES]**.
- Delivery workflow: **[DELIVERY_WORKFLOW]**.
- DevOps: Docker=**[DEVOPS_DOCKER]**, CI=**[DEVOPS_CI]**, Deploy=**[DEVOPS_DEPLOY]**, Version=**[DEVOPS_VERSION]**.
- Process: Delivery=**[PROCESS_DELIVERY]**, Docs=**[PROCESS_DOCS]**, ADR=**[PROCESS_ADR]**.
