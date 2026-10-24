# Agent Instructions for rule-mcp

Use the rule-mcp workflow for every coding task.

## Every prompt

Three rules ride on every prompt, injected by the harness hooks the installer writes
(`SessionStart` states them in full once, `UserPromptSubmit` re-anchors them in one line):

1. Call `rule-mcp` (or `rule_tool_gateway`) **before any implementation**.
2. **NEVER spawn subagents for research or implementation - they burn tokens.** Use rule-mcp tools
   (deterministic, LLM-free) and tokensave (code graph) instead.
3. Keep the output compression-referenceed: substance verbatim, filler gone.

> Every token saved is a token earned.

Agents without hook support (Gemini CLI, Windsurf, Cline, Devin) carry the same rules in the body of
every generated `/rule-mcp-*` command. Opt out with `RULE_MCP_NO_PROMPT_DIRECTIVE=1`.

## Resuming a session

`SessionStart` fires with `source: "resume"` when the user reopens the agent (`claude --resume`,
`claude --continue`). If `docs/handoff/` holds a handoff, the hook runs `rule_tool_handon` and
injects the **verified** result before the first prompt: each claim from the handoff arrives labeled
still true, changed, or unverified, so a merged branch or a landed ADR is not restated as fact.

Nothing is injected on `startup`, `clear` or `fork`, and nothing is injected when there is no
handoff. Opt out with `RULE_MCP_NO_RESUME_HANDON=1`.

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

1. Call `rule-mcp` or `rule_tool_gateway` with full request plus known framework/project path.
2. `rule_tool_gateway` routes, loads evidence, and checks guardrails in a single call.
3. Treat repository/tool evidence as source of truth. Never invent APIs, files, dependencies, tools, requirements, or successful checks.
4. If evidence missing, call `rule_tool_search`; if still absent, state uncertainty.
5. Write failing tests before implementation changes.
6. Use `/rule-area-styleguide` (name leaves like file-tree in the request) for templates and project tree work (ADR 115/117).
7. Run `rule_tool_check`. Failed guardrails are blocking; fix and rerun until all pass.
8. Run project tests/typecheck and report only commands actually executed.
9. Record structural decisions with `rule_tool_process_adr` (disabled by default, enable with `RULE_MCP_AUTO_ADR=1`).
10. Before writing files, run `rule_tool_gateway` to get a receipt; use `rule_tool_apply` with the receipt for writes.
11. After `rule_tool_apply` writes files, Prettier + blank-line fixer + block-spacing fixer run automatically as post-processing.
12. Compress prose / preprocess prompts with `rule_tool_compress` / `/rule-compress`. Close/resume sessions with `/rule-handoff` and `/rule-handon`.

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

Every agent receives the same **registry-driven** clean command set - the `/rule` router pinned first, then one `/rule-mcp-*` command per MCP prompt in alphabetical order (`/rule-mcp-a11y-audit` ... `/rule-update`). Regenerate or list it with `rule-mcp agent-commands`.

- Pi, Claude Code, Gemini CLI, Cursor, Windsurf, Cline: `/rule <request>` plus the full `/rule-mcp-*` set.
- Claude Code: the clean `/rule-mcp-*` commands replace the MCP prompts - the install sets `RULE_MCP_NO_PROMPTS=1`, so the prefixed `/rule:... (MCP)` duplicates are hidden.
- `/rule-handoff` also commits pending work as atomic, scoped conventional commits (plus one separate `docs(adr):`/`docs(handoff):` commit for pending decision docs), writes the generated handoff to `docs/handoff/<NN>-<slug>.md` and commits it alone as `chore(handoff): ...`, and never pushes.
- GitHub Copilot CLI: `/agent`, select `rule-mcp`.
- Codex CLI: invoke globally installed `rule-mcp` skill; exact custom prompt support varies by version.

## Minimal tool surface

Set `RULE_MCP_MINIMAL_TOOLS=1` (off by default) to expose only the fixed dispatcher/action
allowlist (ADR 115) instead of the full per-skill surface (fits clients that cap or truncate the
tool list, and costs less context on every turn): `rule_tool`, `rule_tool_meta`, `rule_tool_update`,
`rule_tool_init`, `rule_tool_gateway`, `rule_tool_apply`, `rule_tool_search`, `rule_tool_check`,
`rule_tool_compress`, `rule_tool_detect`, `rule_tool_handoff`, `rule_tool_handon`, `rule_tool_stats`,
`rule_tool_usage`.

## Environment variables

See [05-env-variables.md](05-env-variables.md) for the complete reference table, persistence, and configuration.

## Layout default

Flex first is the default layout: `display: flex` for rows and columns.
`display: grid` only for named template areas, subgrid, explicit item placement
or overlap, and auto-fit/auto-fill tracks, justified with a `/* grid: why */`
comment (see rule-styleguide-css).
