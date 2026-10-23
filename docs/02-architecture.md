# Architecture

How a request moves through rule-mcp, simplified and product-facing. The
decision log behind it is not part of this site.

## Request path

The flow graph below is the same path an agent takes, top to bottom.

<ol data-part="architecture-diagram" aria-label="Request path, from the agent to the response">
<li data-part="step">
<h3>Agent</h3>
<p>Sends a prompt, a slash command, or a direct tool call.</p>
</li>
<li data-part="step">
<h3>MCP transport</h3>
<p>stdio by default; HTTP+SSE for a long-running local server.</p>
</li>
<li data-part="step">
<h3>Router</h3>
<p><code>pix_tool</code> scores the request and picks the skill or the area hub.</p>
</li>
<li data-part="step">
<h3>Skill or tool</h3>
<p>The chosen skill serves its evidence: styleguide, template, or pattern.</p>
</li>
<li data-part="step">
<h3>Guardrails</h3>
<p>Deterministic checks run against the proposed code before anything is written.</p>
</li>
<li data-part="step">
<h3>Response</h3>
<p>Structured content returns to the agent. The server never calls a model.</p>
</li>
</ol>

## Surfaces

| Surface        | Role                                                                              |
| -------------- | --------------------------------------------------------------------------------- |
| Slash commands | Same set installed into each agent/IDE (`/rule`, `/rule-area-*`, personas, session) |
| MCP tools      | Action tools + one tool per catalog skill                                         |
| MCP prompts    | Workflow, area, and persona prompts                                               |
| MCP resources  | `rule://` indexes and summaries                                                    |
| Guardrails     | Deterministic checks by family / framework                                        |
| CLI            | Install, doctor, serve, setup, tools                                              |

Live counts and the Command · Tool · Skill table: [Surface map](./16-surface-map.md). Full inventories: [08-16](./README.md).

## Design constraints

- **Local-first**: skills on disk; no required network for core use.
- **Model-agnostic**: no LLM inside the server.
- **Registry-driven**: census and agent commands derive from the same registries.
- **ADR 117**: leaf skills have no slash; area hubs collect them.

## Related

- [Getting Started](./01-getting-started.md)
- [Env vars](./05-env-variables.md)
- [Surface map](./16-surface-map.md)

<!-- census:begin:surface-counts -->

## Surface at a glance

| Surface                   | Count | Defined in                                    |
| ------------------------- | ----- | --------------------------------------------- |
| MCP tools                 | 102   | `src/tools/*` via `src/tools/router/index.js` |
| - action tools            | 21    | one per module, registered explicitly         |
| - skill tools             | 81    | one per catalog skill, generated              |
| MCP resources             | 170   | `src/resources/index.js`                      |
| MCP prompts               | 38    | `src/prompts/index.js`                        |
| - reusable                | 19    | workflow and area prompts                     |
| - persona                 | 19    | 19 active roles, one command each             |
| Skills                    | 81    | `skills/rule-*/SKILL.md`                       |
| Review personas           | 19    | `src/core/review/roles/index.js`              |
| Guardrail rules           | 9     | `src/core/guardrails/index.js`                |
| Agent slash commands      | 41    | `src/core/agents/commands/index.js`           |
| Agent/IDE command targets | 13    | `src/core/agents/command-targets/index.js`    |
| CLI commands              | 25    | `src/cli/_program.js`                         |
| Hook events               | 4     | `src/core/agents/_hooks.js`                   |
| Architecture decisions    | 163   | [`docs/adr/ADR.md`](adr/ADR.md)               |

Regenerate with `pnpm census`. The inventories themselves are
[`08-skills.md`](08-skills.md) through [`15-resources.md`](15-resources.md).

<!-- census:end:surface-counts -->
