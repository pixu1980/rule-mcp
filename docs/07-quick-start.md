# Quick start

Use pix-galaxy-mcp through an agent in eight short flows. The
[engineering guides](./08-engineering-guides.md) are the deep version; this page
is the shallow entry.

## 1. Install and init

```bash
git clone https://github.com/pixu1980/pix-galaxy-mcp.git
cd pix-galaxy-mcp
pnpm install
./scripts/install.sh
pix-galaxy-mcp init
```

`init` prepares the recorder directory, the git hooks and the TokenSave graph
when it is installed. `--no-tokensave` skips the graph. Wire the server once
with `pix-galaxy-mcp setup`; `pix-galaxy-mcp doctor` is the health check.

## 2. Route a request

In the agent, call the router:

```json
pix_tool({ "prompt": "create a React form component", "framework": "react" })
```

The response names the routed skill and loads its evidence. If the request is
ambiguous, the router returns an area hub; call `pix_tool` again with the
narrower request. The server is deterministic and never calls a model.

## 3. Check

`pix_tool_check` runs the guardrails for the routed skill:

```json
pix_tool_check({ "skill": "pix-frontend-react", "code": "<the generated code>" })
```

Failed guardrails are blocking. `mode: "project"` runs the graph checks
(cycles, dead symbols, unused imports). The `/pix-check` command is the same
workflow when the agent exposes slash commands.

## 4. Fix

`pix_tool_fix` applies the deterministic fixes (blank lines, braces, ASCII
typography, American spelling) to changed files or an explicit list:

```json
pix_tool_fix({ "files": ["src/App.tsx"], "mode": "fix" })
```

`pix-galaxy-mcp fix --no-dry-run` does the same from the shell; the default is
a dry run.

## 5. Handoff and handon

Before a context boundary, write a handoff:

```bash
pix-galaxy-mcp handoff
```

The agent can call `pix_tool_handoff` instead. On the next session,
`pix_tool_handon` (or `pix-galaxy-mcp handon`) reads the last handoff and
reports which claims still hold. `--list` lists the handoffs; `--file` verifies
one.

## 6. Personas

A persona is a review role with lenses and evidence skills. Run one operation:

```json
pix_tool_plan({ "role": "security", "topic": "the authentication flow" })
pix_tool_audit({ "role": "security" })
pix_tool_review({ "role": "security", "topic": "the diff" })
```

The slash command is `/pix-persona-security`; the request selects the
operation. `pix-galaxy-mcp roles list` shows the registry, and `roles new` adds
a role.

## 7. The cache

The tool cache answers repeated calls. Inspect it with:

```bash
pix-galaxy-mcp cache stats
pnpm cache:report
```

`PIX_GALAXY_MCP_NO_CACHE=1` turns it off for a run. The L2 Nyx similarity tier
is opt-in with `PIX_GALAXY_MCP_NYX_CACHE=1`; the L3 decision-cache replay is
opt-in with `PIX_GALAXY_MCP_DECISION_CACHE_REPLAY=1`.

## 8. The decision layer

The decision layer asks a local model whether a cached core answers the same
request. It is off by default. Measure it in shadow mode first:

```bash
PIX_GALAXY_MCP_DECISION_MODEL=laya \
PIX_GALAXY_MCP_DECISION_CACHE_SHADOW=1 \
pix-galaxy-mcp serve
```

Then read the report:

```bash
pnpm report:decision-cache
```

The report recommends a floor only with zero false replays and enough labeled
predictions. The measured floor is 0.70 (ADR 167). Enable the replay only after
the report confirms it:

```bash
PIX_GALAXY_MCP_DECISION_MODEL=laya \
PIX_GALAXY_MCP_DECISION_CACHE_REPLAY=1 \
pix-galaxy-mcp serve
```

`PIX_GALAXY_MCP_DECISION_CACHE_THRESHOLD` overrides the floor; an invalid value
falls back to 0.70.

## Where to go next

- [Engineering guides](./08-engineering-guides.md): the loop, the guardrails, the docs pipeline
- [CLI](./13-cli.md): every command and flag
- [Env vars](./05-env-variables.md): the full configuration
- [Architecture](./02-architecture.md): the request path
