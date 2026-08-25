# Decision summary

This file summarizes every accepted ADR in `docs/adr/`. Individual ADR files remain the source of truth.

## Decision themes

### Skill taxonomy and composition

- [001-thematic-skill-rename.md](./001-thematic-skill-rename.md): thematic `rule-*` taxonomy.
- [002-scaffold-consolidation.md](./002-scaffold-consolidation.md): scaffolding belongs to semantic skill domains.
- [003-backend-framework-skills.md](./003-backend-framework-skills.md): dedicated Node.js framework skills.
- [004-database-skills.md](./004-database-skills.md): SQL and database-specific skill family.
- [005-toolchain-vite.md](./005-toolchain-vite.md): Vite guidance isolated in toolchain skill.
- [006-forms-per-framework.md](./006-forms-per-framework.md): form patterns owned by each frontend framework.

### Runtime foundations

- [007-vanilla-js-over-typescript.md](./007-vanilla-js-over-typescript.md): ESM JavaScript runtime without compile step.
- [008-sdk-over-handrolled-protocol.md](./008-sdk-over-handrolled-protocol.md): official MCP SDK instead of custom protocol implementation.
- [009-file-based-skill-loading.md](./009-file-based-skill-loading.md): skills remain filesystem-backed Markdown.

### Trust boundary and agent workflow

- [010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md](./010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md): mandatory pre/post-handler enforcement, blocking guardrails, and host-native reusable commands.

## Complete ADR summary

| ADR                                                                                                                                                              | Status   | Decision                                                                                                                                            | Consequences                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [001-thematic-skill-rename.md](./001-thematic-skill-rename.md)                                                                                                   | accepted | Use thematic `rule-*` prefixes.                                                                                                                      | Skills become discoverable and consistently routed.                                                             |
| [002-scaffold-consolidation.md](./002-scaffold-consolidation.md)                                                                                                 | accepted | Merge scaffold responsibilities into semantic domains.                                                                                              | Fewer overlapping skills and one source of truth.                                                               |
| [003-backend-framework-skills.md](./003-backend-framework-skills.md)                                                                                             | accepted | Add dedicated NestJS, Express, Fastify, and Hono guidance.                                                                                          | Framework-specific backend evidence becomes explicit.                                                           |
| [004-database-skills.md](./004-database-skills.md)                                                                                                               | accepted | Add SQL, PostgreSQL, MySQL, and MongoDB skills.                                                                                                     | Data guidance gains focused operational depth.                                                                  |
| [005-toolchain-vite.md](./005-toolchain-vite.md)                                                                                                                 | accepted | Isolate Vite guidance in `rule-toolchain-vite`.                                                                                                      | Frameworks share one build-tool source of truth.                                                                |
| [006-forms-per-framework.md](./006-forms-per-framework.md)                                                                                                       | accepted | Keep form patterns within each framework skill.                                                                                                     | Avoids cross-framework leakage.                                                                                 |
| [007-vanilla-js-over-typescript.md](./007-vanilla-js-over-typescript.md)                                                                                         | accepted | Implement server in ESM JavaScript.                                                                                                                 | No build step; runtime validation remains essential.                                                            |
| [008-sdk-over-handrolled-protocol.md](./008-sdk-over-handrolled-protocol.md)                                                                                     | accepted | Use official MCP SDK.                                                                                                                               | Protocol behavior follows maintained upstream contracts.                                                        |
| [009-file-based-skill-loading.md](./009-file-based-skill-loading.md)                                                                                             | accepted | Load `SKILL.md` files from disk.                                                                                                                    | Skills stay inspectable and independently editable.                                                             |
| [010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md](./010-fail-closed-mcp-enforcement-and-reusable-agent-commands.md)                               | accepted | Enforce every handler boundary and install reusable host workflows.                                                                                 | Safer deterministic output at cost of stricter payloads and host-path maintenance.                              |
| [035-installer-self-heals-global-shim-surfaces-failures-gates-tui-rendering.md](./035-installer-self-heals-global-shim-surfaces-failures-gates-tui-rendering.md) | accepted | Verify/repair the global binary before trusting it; never `pnpm link --global`; surface CLI errors; gate TUI rendering; prettier-clean rules block. | Installers cannot fail silently or corrupt the workspace; piped output stays clean; `CLAUDE.md` stops churning. |

## Operating rules

- Use `rule_tool_process_adr` for new decisions.
- Do not rewrite accepted decisions; supersede them with a new ADR.
- Keep this summary and `README.md` synchronized with every ADR file.
