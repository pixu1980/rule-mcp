## HANDOFF: rule-mcp

- Branch: `main`
- Commit range: `dd0db5b8..66188b2d`
- Date: 2026-09-23
- File: `docs/handoff/21-fix-tool-and-nomenclature-alignment.md`

### Project Identity

- Description: MCP server for rule-mcp-* skill ecosystem. Serves styleguides, component templates, framework best practices, and design system patterns.
- Version: 0.2.0-rc

### Shipped this session

**The install honors the skills choice both ways (ADR 121).** The `Bundled rule-mcp-* skills` step is opt-in, but a run that did not select it removed nothing, so directories copied by an earlier install stayed in `~/.agents/skills` and the host kept advertising `/skill:rule-mcp-*`. The uninstall path was broken too: `skillsRemovalTask` called `skills uninstall --dry-run`, an action the CLI never implemented. `skills uninstall` is now real (`--scope`, `--dry-run`) and removes the server's namespace (`rule-mcp`, `rule-mcp-*`) from `~/.agents/skills`, `~/.claude/skills` and the legacy `~/.claude`, including renamed catalog skills and the old per-operation persona skills, while a user's own skill survives. The install plan always carries one skills row: `skillsTask` when selected, `skillsRemovalTask` when not. The machine was cleaned: 180 + 57 + 2 rule-mcp directories removed, zero left.

**`rule_tool_fix` and `/rule-fix` (ADR 122).** `rule_tool_fix` existed in the code but `registerFixTool` was called from nowhere, so `rule-mcp fix` and the doctor fix answered `Unknown tool`, and the tool was absent from the surface map. It is registered again, through `registerActionTools`, with a new job: apply the deterministic guardrail fixes every skill owns (blank lines, braces, single-line bodies, ASCII typography, American spelling) to the changed files or an explicit list, in `lint` or `fix` mode. `/rule-fix` mirrors it on the `/rule-check` pattern. The passes live in `core/guardrails/fix/`, shared with `scripts/fix`, so the tool, the script and the command cannot drift. The file-tree lint/fix/generate modes are gone; file-tree drift is reported by `rule_tool_check` with `rule-mcp-styleguide-file-tree`.

**Nomenclature aligned with the surface map.** Old tool spellings fixed across live code and shipped skills: `rule_tool_check` -> `rule_tool_check`, `rule_tool_search` -> `rule_tool_search`, `rule_tool_styleguide` -> `rule_tool_styleguide`, `rule_tool_detect` -> `rule_tool_detect`, `rule_tool_gateway`/`rule_tool_apply` -> `rule_tool_*`. Tools ADR 115 removed were repointed to the current capability: `rule_tool_scaffold` -> `rule_tool_styleguide mode=scaffold`, `rule_tool_component` -> the `rulemcp://templates` resource, `rule_tool_a11y_report` -> the a11y persona and `rule_tool_check`. The dead register modules for those tools were deleted.

Surface: 107 tools, 40 commands, 37 prompts, 89 skills. The surface map now maps `rule-fix` -> `rule_tool_fix`.

Gate: `pnpm test:all` exits 0 (`all: ok`), `rule_tool_check` passes on every changed src file, `docs-scan` is clean, the census and its fixtures are regenerated.

### ADR Log

| #   | Status   | Title                                                             | Tags                                  | Decision                                                                                                            |
| --- | -------- | ----------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 122 | accepted | The fix tool and command apply the deterministic guardrails...    | tools, commands, guardrails           | `rule_tool_fix` applies the deterministic guardrail fixes, not the file tree; `/rule-fix` mirrors it.               |
| 121 | accepted | The install reconciles the bundled skills when the step is not... | installer, skills, commands           | Declining the skills step removes what an earlier install copied; `skills uninstall` is a real action.              |
| 120 | accepted | Fold the per-operation persona commands into one per role...      | commands, personas, prompts, breaking | One `/rule-persona-<role>`; the depth is read from the request; operations stay cumulative; old names deleted.      |
| 117 | accepted | Area slash commands are collectors only...                        | commands, prompts, areas              | Slash and MCP area prompts emit only hub collectors; leaves route from free text.                                   |
| 116 | accepted | Fold check slash siblings into the parent via keyword intent      | commands, guardrails, breaking        | Delete every `/rule-area-*-check` sibling; keep `/rule-check`; fold check intent into the parent.                   |
| 115 | accepted | Map tools, slash commands, and skills into one surface            | tools, commands, skills               | One generated Command/Tool/Skill map; removed `rule_tool_component`, `rule_tool_scaffold`, `rule_tool_a11y_report`. |

Full log: `docs/adr/ADR.md` (122 entries).

### Recent Commits

```
66188b2d chore(census): map the rule-fix command to rule_tool_fix
a9333f14 docs(adr): record 122 and regenerate the census for the fix tool
9f2e7f3a docs(skills): align the shipped skills with the surface map
46740453 feat(tools): register rule_tool_fix and add /rule-fix as the deterministic guardrail fixer
b0af7870 chore(census): refresh the generated-document hashes for 121
922c387f docs(adr): record 121
8042a06b fix(install): reconcile the bundled skills when the step is not selected
dd0db5b8 chore(handoff): add session handoff 20-persona-command-fold-and-red-suite-cleanup
```

### Flagged, not fixed

- `main` is 25 commits ahead of `origin/main` and has not been pushed.
- The skills purge runs on the next `agent-commands --sync` / `skills install`; this machine was cleaned directly, but a fresh install on another machine reconciles on the next run.
- Backlog Step 4 (ARCH-10) is open: there is no `Transport` interface and no `ToolPolicy` type (`docs/plans/backlog.md`).
- The owner actions in `docs/plans/backlog.md` (GitHub vulnerability reporting, branch protection, Pages URL, labels, sponsors, Vigilant Mode, stale `v1.0.0` tag) are unchanged.
- The docs site and the presentation deck are the agreed next workstream; the deck artifact (new or existing) is not yet confirmed.

### Resume Prompt

next session opens with this block.

```prompt
Resume work on rule-mcp from `docs/handoff/21-fix-tool-and-nomenclature-alignment.md`.
Run `rule_tool_handon` first: it checks which claims in this handoff still hold before any of them are trusted.
The ADR log and the context snapshot capture what has been decided; do not re-ask answered questions.
Every commit is `type(scope): subject`; the commit-msg hook rejects a scope-less message.

Branch: `main` (25 commits ahead of origin/main; never pushed).
Commit range covered: `dd0db5b8..66188b2d`.
Shipped this session: the install reconciles the bundled skills (ADR 121) and `rule_tool_fix` + `/rule-fix` apply the deterministic guardrails (ADR 122); the nomenclature was aligned with the surface map and the dead tool modules removed. `pnpm test:all` is green; the surface is 107 tools, 40 commands.

First step: resume the documentation site and the presentation deck. Ask the user which artifact to start and whether the deck is new or already exists, then update the docs-site surface/counts pages (`scripts/docs-site/`, rebuild `site-dist/`) for 107 tools, 40 commands and ADR 122 before touching the deck.
```
