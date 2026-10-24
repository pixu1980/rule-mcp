# Port plan: ADR policy, project installs, features, host paths

Status: `planned`
Notes:`planned` Notes:`planned`. Outside the skills graph: this plan covers repository policy and the installer, not skills, so it is not a node in `docs/plans/skills/skills-plan.md` and is tracked on its own.

A sibling project shipped this set of installer and documentation changes on 2026-10-18. This plan
replays it here, adapted to this repository's names (`rule-mcp`, `RULE_MCP_*`,
`rule_tool_process_adr`, `/rule-handoff`, `~/.rule-mcp/`). A port is a merge, not a copy: diff each
subsystem first and keep what this repository already does better.

Rules for every step: tests first, Conventional Commits with a scope, never push, run the full
gates (`pnpm run ci`), and run the guardrail check on every changed file.

## What exists here today

Checked on `main` at `46f84e5a`:

| Capability                                      | Here today                                                |
| ----------------------------------------------- | --------------------------------------------------------- |
| ADR policy (`full` / `handoff` / `on-demand`)   | absent: only `RULE_MCP_AUTO_ADR` / `DISABLE_AUTO_ADR`     |
| Pending ADRs numbered on landing                | absent (`docs/adr/_pending/` not used)                    |
| Index merge driver, `post-merge`/`post-rewrite` | absent                                                    |
| Install scope `project` for MCP configs         | absent (`--scope` exists for skills only)                 |
| Feature toggles (`feature list/enable/disable`) | absent; switches are raw env vars                         |
| Claude attribution switch                       | absent                                                    |
| Path completion in the setup wizard             | absent                                                    |
| Vendor-documented generic host paths            | partial: most hosts still use `~/.config/<name>/mcp.json` |
| JetBrains config                                | writes `.idea/mcp.json` into the cwd (undocumented path)  |
| Project rules block refresh                     | absent                                                    |
| Numbering doctor rename threshold               | `--follow` at git's 50% default (same bug)                |

## Order

Quick wins first: they are independent and small. Then the ADR stack, then the installer stack,
which depends on it.

### Step 1 - Numbering doctor follows only real renames (quick win)

Problem: `git log --follow` treats any file at least 50% similar to a deleted one as a rename, so a
new document built on the same template inherits the deleted one's date and author.

1. Test `tests/docs/numbering-created-at.test.mjs` (or under `src/core/docs-numbering/__tests__/`):
   a temp repo, a 10-line file committed in January, deleted in February together with a new file.
   - 60% similar: the new file keeps February and its own author.
   - 90% similar (a real rename): it keeps January and the first author.
   - Commit with `-c core.hooksPath=/dev/null --no-verify` so global hooks cannot block.
2. `src/core/docs-numbering/_git.js`: add `const RENAME_SIMILARITY = "-M70%";` with a JSDoc on why
   (distinct ADRs measured at most 32% similar, real renames at least 85%), and pass it to both
   `git log` calls (`createdAt` and the author lookup) before `--follow`.
3. Measure on this repository's own ADRs before trusting 70%.
4. Commit: `fix(docs): follow only real renames when dating a numbered document`.

### Step 2 - JetBrains goes to Junie's file (quick win)

JetBrains AI Assistant documents no config file (servers live in the IDE settings). Junie, in the
IDE and the CLI, documents `~/.junie/mcp/mcp.json` (user) and `.junie/mcp/mcp.json` (project), both
`mcpServers`.

1. Tests: install, detect and uninstall `jetbrains` in a throwaway `HOME`; the entry lands in
   `~/.junie/mcp/mcp.json` and nothing is written under the cwd.
2. `src/cli/installers/_agents-ide.js`: export `junieConfigPath = () => join(HOME, ".junie", "mcp", "mcp.json")`
   and use it in the jetbrains installer.
3. Use it in `src/cli/installers/_uninstall.js` and `src/cli/install/_detect.js` too.
4. Docs: the agent path table (`docs/01-getting-started.md`, `docs/04-operations.md`).
5. Old `.idea/mcp.json` files are not swept: an uninstall must never touch a project directory.
6. Commit: `fix(setup): install JetBrains into the file Junie reads`.

### Step 3 - Generic hosts at their documented paths

One table, read by install, uninstall and detection, so the three cannot disagree. Create
`src/cli/installers/_hosts.data.js`:

| Host        | User-level file                                                       | Format            |
| ----------- | --------------------------------------------------------------------- | ----------------- |
| cline       | `~/.cline/data/settings/cline_mcp_settings.json`                      | `mcpServers`      |
| roo         | `~/.config/roo/mcp.json` (no documented file)                         | `mcpServers`      |
| zed         | `~/.config/zed/settings.json` (Windows `%APPDATA%\Zed\settings.json`) | `context_servers` |
| opencode    | `~/.config/opencode/opencode.json`                                    | `opencode`        |
| antigravity | `~/.gemini/config/mcp_config.json`                                    | `mcpServers`      |
| kilo        | `~/.config/kilo/kilo.json`                                            | `opencode`        |
| kimi        | `~/.kimi-code/mcp.json`                                               | `mcpServers`      |
| vibe        | `~/.vibe/config.toml`                                                 | `[[mcp_servers]]` |
| grok        | `~/.grok/config.toml`                                                 | `[mcp_servers.x]` |
| droid       | `~/.factory/mcp.json` (here today: `~/.config/factory/mcp.json`)      | `mcpServers`      |
| kiro        | `~/.kiro/settings/mcp.json`                                           | `mcpServers`      |
| qwen        | `~/.qwen/settings.json`                                               | `mcpServers`      |

1. Test file: for each host, install into a temp `HOME`, assert the file and its shape, detection
   at that path, idempotent reinstall, and uninstall removing the entry. Assert the legacy
   `~/.config/<name>/mcp.json` is not written.
2. A `_host-formats.js` with `upsertHostServer(format, text, config)` / `removeHostServer`, plus
   TOML writers for vibe and grok.
3. Uninstall and detection also check the legacy `~/.config/<name>/mcp.json`, so an old install can
   still be found and removed.
4. Commit: `fix(setup): write generic hosts to their documented config paths`.

### Step 4 - ADR policy

1. `src/core/docs/adr-policy/` (or `src/core/adr-policy/` to match this tree):
   - `_words.data.js`: categories `schema`, `dependency`, `api`, `infra`; levels `full`, `handoff`,
     `on-demand`; aliases `decision` -> `full`, `off` -> `on-demand`; `POLICY_FILE = ".context/adr.json"`,
     `POLICY_ENV = "RULE_MCP_ADR_POLICY"`.
   - `_resolve.js`: the first source that parses answers whole, never merged:
     `.context/adr.json` (nearest, up to the repo root) -> env var (a level or JSON
     `{"default":"handoff","categories":{"dependency":"full"}}`) -> the same key in
     `~/.rule-mcp/config/env.json` -> default `handoff`.
   - `_rule.js`: `ADR_RULE` (static text for rules blocks and generated commands) and
     `adrRule(policy, { terse })` (for surfaces that run inside a project).
2. `rule_tool_process_adr` gains `category` and `moment` (`handoff` or `task`, default `task`) and
   answers "Not written" with the rule when the policy does not allow the call.
3. Replace every "record decisions without being asked" line (rules block, reminder, router
   follow-up, `ADR.md` footer, handoff body) with the policy rule.
4. Add the policy to the router cache key.
5. `RULE_MCP_AUTO_ADR` writes nothing when the ADR feature is off.
6. Tests: resolution order, aliases, per-category override, the tool refusing a mid-task call
   under `handoff`.
7. One ADR (pending, see step 5).
8. Commit: `feat(adr): write ADRs when a policy says so, at handoff by default`.

### Step 5 - ADR numbers given on landing

1. Off the trunk, `rule_tool_process_adr` writes `docs/adr/_pending/<slug>.md` and refers to it as
   `ADR <slug>`.
2. `src/core/docs/adr-pending/`:
   - `_list.js`: the pending ADRs, ordered by first add commit, ties by slug.
   - `_land.js`: on the trunk, give each the next number and rewrite every reference. It must be
     deterministic, so two people landing the same pull write the same tree.
   - `_settle.js`: off the trunk, separate documents a merge left on one number.
   - `_merge-index.js`: a git merge driver for `ADR.md` and `HANDOFF.md` that regenerates instead of
     merging.
3. CLI: `rule-mcp handoff land [--commit] [--quiet]` and
   `handoff merge-index <O> <A> <B> <P>`.
4. Git: `.githooks/post-merge` and `post-rewrite` run `handoff land --quiet --commit`.
   `.gitattributes` gets `docs/adr/ADR.md merge=<driver>` and `docs/handoff/HANDOFF.md merge=<driver>`.
5. `src/core/git-hooks/`: plan -> apply -> remove for those hooks and the driver, idempotent (a
   second run is all "preserve"), private variant (`.git/info/attributes`) for local installs.
6. `/rule-handoff`: run `handoff land --commit` before writing ADRs, then pass `moment: "handoff"`.
7. Watch out: a squash gives every pending ADR the same add commit, so the landing order becomes
   alphabetical. Regenerate the index after a squash (`handoff doctor --fix`).
8. Commit: `feat(adr): number pending ADRs when they land on the trunk`.

### Step 6 - Features

1. `src/core/runtime/features/_catalog.data.js`: each feature a list of levels (default first),
   each level the env keys it writes (`null` removes the key):
   - `adr`: on, off (`NO_ADR`). Off removes `rule_tool_process_adr`, `rule_tool_handoff`,
     `rule_tool_handon`, `/rule-handoff`, `/rule-handon`, the rule line and the numbering hooks.
   - `telemetry`: full, anonymous (no prompt text, machine id or client name), off.
   - `update`: auto, notify, off.
   - `tokensave`: on, autotrack (also `tokensave branch add`), off.
   - `minimal-tools`: off, on.
2. `READERS`: each feature's level read back from env, legacy keys included.
3. Saved to `~/.rule-mcp/config/env.json`, which every server reads at start.
4. CLI `rule-mcp feature list | enable <id> [--level x] | disable <id> [--dry-run]`: writes the
   level, then re-applies the remembered global install and every recorded project (step 8), so
   rules, commands and hooks follow it.
5. `setup --feature id=level` (repeatable), `setup --adr-policy <level>`, and a Features step in the
   wizard with one level screen per multi-level feature.
6. Commit: `feat(setup): own every user-facing switch as a feature`.

### Step 7 - Claude attribution

1. `src/cli/installers/_attribution.js`: `applyAttribution(settingsText, { keep })`.
   `--no-attribution` writes Claude Code's `attribution` setting empty; `--attribution` takes back
   only the exact value an install wrote. A value the user set stays.
2. `setup --attribution | --no-attribution`, plus a wizard extra.
3. Commit: `feat(setup): let setup keep or hide Claude Code attribution`.

### Step 8 - Project-scope install

1. `src/cli/installers/_project-hosts.data.js`: where each host reads a project config.

   | Host              | File                                     | Local (private) file              |
   | ----------------- | ---------------------------------------- | --------------------------------- |
   | claude            | `.mcp.json` (shared)                     | project entry in `~/.claude.json` |
   | copilot, pi       | `.mcp.json`                              | -                                 |
   | codex             | `.codex/config.toml`                     | -                                 |
   | cursor            | `.cursor/mcp.json`                       | -                                 |
   | vscode            | `.vscode/mcp.json` (`servers`)           | -                                 |
   | gemini            | `.gemini/settings.json`                  | -                                 |
   | qwen              | `.qwen/settings.json`                    | -                                 |
   | roo               | `.roo/mcp.json`                          | -                                 |
   | kiro              | `.kiro/settings/mcp.json`                | -                                 |
   | droid             | `.factory/mcp.json`                      | -                                 |
   | devin             | `.devin/mcp_config.json`                 | `.devin/mcp_config.local.json`    |
   | kimi              | `.kimi-code/mcp.json`                    | -                                 |
   | vibe              | `.vibe/config.toml`                      | -                                 |
   | grok              | `.grok/config.toml`                      | -                                 |
   | opencode          | `opencode.json`                          | -                                 |
   | zed               | `.zed/settings.json` (`context_servers`) | -                                 |
   | jetbrains (Junie) | `.junie/mcp/mcp.json`                    | -                                 |

   No project file is documented for cline, antigravity, neovim, emacs, windsurf. kilo's docs name
   two files, so wait. Use `.mcp.json` for pi rather than `.pi/mcp.json`: `.pi/` may be a symlink
   to `.agents/`.

2. `src/cli/installers/_install-project.js`: one writer per row. A shared entry is
   `{ command: "rule-mcp", args: ["serve"] }` with no machine paths. A local entry carries the
   full launcher and `RULE_MCP_ADR_POLICY` when set. A host with no local file throws
   "`<agent>` has no local project config: use --project-config shared".
3. Claude shared: the short instruction block in `CLAUDE.md`, the commands in `.claude/commands/`,
   hooks and attribution in `.claude/settings.json` (`settings.local.json` for local).
4. Prompt suppression per client: `RULE_MCP_NO_MCP_PROMPTS` accepts `1` or a comma list of MCP
   client names. A shared `.mcp.json` sets `claude-code`, because copilot and pi read the same file
   and get no command files.
5. Setup: `--scope global|project`, `--project <path>` (repeatable), `--project-config local|shared`.
   A shared install is stdio only and writes nothing global (no skills, service or remember).
6. `~/.rule-mcp/state/projects.json` records each project install. `update`,
   `setup --refresh-projects` and `setup --uninstall` walk it.
7. `rule-mcp project add [path] [--project-config] [--agent]` copies the last recorded
   project's configuration; `project remove [path]` takes back every config and forgets it.
   `/rule-init` adds its own project when the install is per project.
8. Each project also gets the numbering hooks and merge driver from step 5.
9. Wizard: a Scope step (global / project), a project list with the cwd offered, `p` to type a
   path, then a Project config step (shared / local).
10. One test file per concern: hosts table, Claude project, membership, record, git, scope; each
    under the 150-line cap.
11. ADR: a project-scope install writes only into the chosen projects.
12. Commit: `feat(setup): install into chosen projects`.

### Step 9 - Path completion in the wizard

1. `src/cli/setup/_path-complete.js`:
   - `expandPath(text, cwd)`: `~` and relative paths.
   - `isSensitiveDir(path)`: `~/.ssh`, `~/.aws`, `~/.config/gh`, `~/.gnupg`, `~/.password-store`,
     `~/.kube`, `/etc/ssh` are never listed.
   - `suggestPaths(text, cwd)`: null without a `/`. A token ending in `/` lists every folder,
     dot folders included. A partial name filters by case-insensitive prefix and shows dot
     folders only once a dot is typed. It skips names with control characters (macOS `Icon\r`),
     offers folders only, sorts with `localeCompare`, and returns
     `{ prefix, items: [{ name, value }] }` with `value` ending in `/`.
2. `src/cli/setup/_widget-path.js` (`PathInput`):
   - Tab opens a menu (8 visible, `n/total` footer); Tab or Enter applies the selection.
   - Up and down wrap around.
   - Esc closes the menu, or goes back when none is open.
   - Typing closes the menu.
   - Enter accepts the text only when it names a folder; otherwise "Not a folder: <path>".
   - Count backspaces per character: a burst arrives as one chunk.
3. Tests: `suggestPaths` over a temp tree; the widget driven by keystrokes in the fake terminal.
4. Commit: `feat(setup): complete project paths from a scrollable menu`.

### Step 10 - Refresh an existing project rules block

A global install never writes into a project, so a rules block a project carries keeps its old
text forever.

1. Test: a project whose `CLAUDE.md` holds a stale `<!-- rule-mcp-rules -->` block plus its
   own text, and an `AGENTS.md` without one.
   - The refresh replaces the block and keeps the text.
   - It leaves `AGENTS.md` alone and creates no file.
   - A second run reports `current`; a dry run writes nothing.
   - The project refresh plan has a `rules:<project>` step; `init` returns `rules`.
2. `src/cli/installers/_rules-project.js`: `refreshProjectRules(project, { dryRun })` over
   `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursorrules`. It touches only files that already carry
   the marker, using the same strip-and-append the global writer uses.
3. A `projectRulesTask({ project })` step in every project install, before the git step.
4. `init`: call it and print a "Rules block:" line.
5. Commit: `feat(setup): refresh an existing project rules block on init and project installs`.

### Step 11 - Documentation

1. `docs/03-agent-instructions.md`:
   - An "ADR policy" section with the level table and the source order.
   - A "Where the rules live" section: global targets, plus the project refresh by init and project
     installs.
   - Replace any "record decisions without being asked" wording.
   - Explain `NO_MCP_PROMPTS=claude-code` for shared projects.
2. `docs/04-operations.md`:
   - "Install into chosen projects" (shared vs local, recorded list, `project add/remove`, hosts
     without a project file).
   - "Features" (table and commands).
   - "Claude attribution".
3. `docs/05-env-variables.md`: `RULE_MCP_ADR_POLICY`, `NO_ADR`, `TELEMETRY` (full/anonymous/off),
   `NO_MCP_PROMPTS` (client list), and the feature -> env key table.
4. `docs/08-engineering-guides.md`:
   - The init table: numbering hooks, merge driver, rules refresh, project install.
   - The handoff section: `handoff land` and `_pending/`.
5. `docs/13-cli.md` and the census files: regenerate with the repo's generator (`feature`,
   `project`, `handoff land|merge-index`, the new `setup` flags).
6. Commit: `docs(project): document ADR policy, project installs, features and rules refresh`.

## Verification at the end

```sh
pnpm run ci
rule-mcp commits --range main..HEAD
rule-mcp feature list
rule-mcp setup --scope project --project /tmp/try --project-config shared --dry-run
rule-mcp handoff doctor
```

Then `/rule-handoff close-feature` and hand the person the close command. Never push.

## Dependency graph

Absorbed or outside the graph: listed for completeness, not executed as a node.

Depends on: -

Feeds: -

Shared files: none: outside the skills graph

## Steps

- [ ] Diff each ported subsystem against this repository and keep what is already better.

## Model assignment

Classes and evidence: section 14 of `docs/plans/plan-of-plans.md`.

| Step           | Class      | Model            | Why                                                      |
| -------------- | ---------- | ---------------- | -------------------------------------------------------- |
| the whole plan | `T3-rules` | `kimi-k2.7-code` | installer and ADR-policy code paths: small precise edits |

Plan default: `T3-rules` - `kimi-k2.7-code`. Fallback: `step-5-preview` for authoring, `glm-5.3-flash` for bulk edits.
