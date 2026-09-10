# Agent Instructions for pix-galaxy-mcp

Use the pix-galaxy-mcp workflow for every coding task.

## Every prompt

Three rules ride on every prompt, injected by the harness hooks the installer writes
(`SessionStart` states them in full once, `UserPromptSubmit` re-anchors them in one line):

1. Call `pix` (or `pix_tool_gateway`) **before any implementation**.
2. **NEVER spawn subagents for research or implementation - they burn tokens.** Use pix tools
   (deterministic, LLM-free) and tokensave (code graph) instead.
3. Keep the output caveman-compressed: substance verbatim, filler gone.

> Every token saved is a token earned.

Agents without hook support (Gemini CLI, Windsurf, Cline, Devin) carry the same rules in the body of
every generated `/pix-*` command. Opt out with `PIX_GALAXY_MCP_NO_PROMPT_DIRECTIVE=1`.

## Resuming a session

`SessionStart` fires with `source: "resume"` when the user reopens the agent (`claude --resume`,
`claude --continue`). If `docs/handoff/` holds a handoff, the hook runs `pix_tool_process_handon` and
injects the **verified** result before the first prompt: each claim from the handoff arrives labeled
still true, changed, or unverified, so a merged branch or a landed ADR is not restated as fact.

Nothing is injected on `startup`, `clear` or `fork`, and nothing is injected when there is no
handoff. Opt out with `PIX_GALAXY_MCP_NO_RESUME_HANDON=1`.

Not every harness spells resume as a session event. `pi resume` turns the word into the user's
first message, and no hook fires at all. So the prompt is the second signal: when the prompt is a
bare resume request and nothing else (`resume`, `riprendi`, `continue where we left off`, ...), the
first tool call of the process carries the same verified handoff, prepended beside the self-update
banner. It fires once per process, and it is applied outside the result cache, so a stored answer
never replays a snapshot of a repository that has moved.

A prompt that asks for real work is not a resume signal: the whole prompt has to be one of the
resume phrasings, so "continue implementing the parser" routes normally.

The two doors never both open. The hook records what it injected in the state directory, keyed by
project; the tool path stays quiet when that record was written after the server process started,
which for a stdio server means during this session. A record from a previous session suppresses
nothing, so resuming twice from the same handoff works twice.

## Recommended workflow

1. Call `pix` or `pix_tool_gateway` with full request plus known framework/project path.
2. `pix_tool_gateway` routes, loads evidence, and checks guardrails in a single call.
3. Treat repository/tool evidence as source of truth. Never invent APIs, files, dependencies, tools, requirements, or successful checks.
4. If evidence missing, call `pix_tool_search`; if still absent, state uncertainty.
5. Write failing tests before implementation changes.
6. Use `pix_tool_component` for component templates, `pix_tool_scaffold` for project config files.
7. Run `pix_tool_check`. Failed guardrails are blocking; fix and rerun until all pass.
8. Run project tests/typecheck and report only commands actually executed.
9. Record structural decisions with `pix_tool_process_adr` (disabled by default, enable with `PIX_GALAXY_MCP_AUTO_ADR=1`).
10. Before writing files, run `pix_tool_gateway` to get a receipt; use `pix_tool_apply` with the receipt for writes.
11. After `pix_tool_apply` writes files, Prettier + blank-line fixer + block-spacing fixer run automatically as post-processing.

## Advisory boundaries

The server applies preprocessing (rejects malformed/unsafe input) and postprocessing (validates output shape).
These are **advisory** - they improve reliability but MCP protocol cannot enforce tool call ordering.
See `src/core/enforcement.js` for details.

## Frontend principles

- **Zero CSS classes** - element and `[data-part]`/`[data-*]` selectors only.
- **Zero inline styles** - external CSS or framework-native external loading.
- **Flex first** - `display: grid` only for named areas, subgrid, explicit placement or overlap, and auto-fit tracks; anything a flex row or column can do is flex, and a legitimate grid says which case it is in a `/* grid: why */` comment.
- **Semantic HTML mandatory** - use semantic element instead of generic `<div>` where available.
- **Barrel pattern** - component folder has `index.js`; implementation files use `_PascalCase.ext`.
- **No unapproved CSS frameworks** - no Tailwind, Bootstrap, or CSS-in-JS.

## Reusable entry points

Every agent receives the same **registry-driven** clean command set - the `/pix` router pinned first, then one `/pix-*` command per MCP prompt in alphabetical order (`/pix-a11y-audit` ... `/pix-update`). Regenerate or list it with `pix-galaxy-mcp agent-commands`.

- Pi, Claude Code, Gemini CLI, Cursor, Windsurf, Cline: `/pix <request>` plus the full `/pix-*` set.
- Claude Code: the clean `/pix-*` commands replace the MCP prompts - the install sets `PIX_GALAXY_MCP_NO_PROMPTS=1`, so the prefixed `/pix-galaxy-mcp:… (MCP)` duplicates are hidden.
- `/pix-handoff` also commits pending work as atomic, scoped conventional commits (plus one separate `docs(adr):`/`docs(handoff):` commit for pending decision docs), writes the generated handoff to `docs/handoff/<NN>-<slug>.md` and commits it alone as `chore(handoff): …`, and never pushes.
- GitHub Copilot CLI: `/agent`, select `pix-galaxy-mcp`.
- Codex CLI: invoke globally installed `pix` skill; exact custom prompt support varies by version.

## Minimal tool surface

Set `PIX_GALAXY_MCP_MINIMAL_TOOLS=1` (off by default) to expose only the 10 dispatcher/action
tools instead of the full per-skill surface (fits clients that cap or truncate the tool list, and
costs less context on every turn): `pix_tool`, `pix_tool_update`, `pix_tool_gateway`,
`pix_tool_apply`, `pix_tool_search`, `pix_tool_check`, `pix_tool_scaffold`, `pix_tool_detect`,
`pix_tool_process_handoff`, `pix_tool_component`.

## Environment variables

See [05-env-variables.md](05-env-variables.md) for the complete reference table, persistence, and configuration.

## Layout default

Flex first is the default layout: `display: flex` for rows and columns.
`display: grid` only for named template areas, subgrid, explicit item placement
or overlap, and auto-fit/auto-fill tracks, justified with a `/* grid: why */`
comment (see pix-styleguide-css).
