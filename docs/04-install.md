# Install and uninstall

This chapter tells what the installer writes and removes. The tables come from real runs in an empty home directory.

## What setup does

`rule-mcp setup` has ten steps. Add `--dry-run` to preview them. A dry run writes nothing.

| Step              | Result                                                                    |
| ----------------- | ------------------------------------------------------------------------- |
| Runtime home      | Creates `~/.rule-mcp/` with `state/`, `data/`, `projects/`, `config/`     |
| Launcher copy     | Copies the server to `~/.rule-mcp/launcher/<version>/` (about 80 MB)      |
| Global shim       | Writes the `rule-mcp` command in `$PNPM_HOME/bin`                         |
| Configure agent   | Adds the MCP entry to the agent configuration                             |
| Instruction files | Adds the rules block to the instruction file of the agent                 |
| Slash commands    | Writes the `/rule-*` command files                                        |
| Bundled skills    | Copies the skills only with `--skills`, and removes old copies without it |
| Global CLI        | Runs `rule-mcp --version`, `tools list`, and `doctor`                     |
| Install manifest  | Writes `~/.rule-mcp/config/install.json`                                  |
| Health check      | Runs `rule-mcp doctor`                                                    |

For a run with no prompts, use `rule-mcp setup --no-wizard --no-interactive`. Add `--agent <name>` for one agent. Claude also gets the guard hooks and the guard daemon. Add `--no-service` to skip the platform service.

## Launcher

The launcher copy lets the command work when the clone moves. `pnpm deploy` makes the copy with its dependencies. The `rule-mcp` shim selects the target in this order:

1. The version in `~/.rule-mcp/launcher/current`, if that copy exists.
2. The clone that the install used, if it still exists.
3. If neither exists, the shim stops with exit code `127` and tells you to run `rule-mcp setup`.

`rule-mcp doctor` shows the target in use.

## Uninstall

Select the command by what you want to remove. "Yes" means that the command removes the item.

| Item                    | `uninstall`  | `setup --uninstall` | `setup --uninstall --purge` |
| ----------------------- | ------------ | ------------------- | --------------------------- |
| MCP entry               | Yes          | Yes                 | Yes                         |
| Rules block and hooks   | Yes          | Yes                 | Yes                         |
| `install.json`          | Yes          | Yes                 | Yes                         |
| `config/env.json`       | Yes          | No                  | Yes                         |
| `/rule-*` command files | `/rule` only | Yes                 | Yes                         |
| Launcher copy and shim  | No           | Yes                 | Yes                         |
| `~/.rule-mcp/` data     | No           | No                  | Yes                         |

`--keep-config` keeps the two switches files. `--no-interactive` runs with the defaults and asks nothing. The uninstall does not touch the files of your project.

The uninstall removes its own entries and does not delete agent files. For example, `~/.claude.json` stays, and it can be empty after the uninstall.

You can also use `./scripts/uninstall.sh`. The script calls `rule-mcp setup --uninstall`.

## Install into selected projects

This command writes only into the projects that you name:

```bash
rule-mcp setup --scope project --project ~/my-project --project-config shared
```

The installer records each project in `~/.rule-mcp/state/projects.json`. `rule-mcp project add [path]` adds a project. It uses the agents and the configuration kind of the last project. `rule-mcp project remove [path]` removes the configuration and the record.

| Kind     | Entry                                           | Use                    |
| -------- | ----------------------------------------------- | ---------------------- |
| `shared` | `{ "command": "rule-mcp", "args": ["serve"] }`  | A file that you commit |
| `local`  | The full launcher path and the machine settings | A private project file |

A host with no private project file refuses `local`. The error is "has no local project config".

A project with Claude also gets three items at the project root. The rules block goes in `CLAUDE.md`, the commands go in `.claude/commands/`, and the hooks go in `.claude/settings.json`. A `local` install uses `.claude/settings.local.json`.

Each project also gets the git side of ADR numbering. `.githooks/post-merge` and `post-rewrite` run `rule-mcp handoff land --quiet --commit`. The `rule-mcp-index` merge driver builds `ADR.md` and `HANDOFF.md` again. A directory with no git repository skips this part.

## Docker

The `Dockerfile` builds an image that serves HTTP and SSE on port `37999`. Compose publishes the port on the loopback address only:

```bash
docker compose up -d
```

```bash
curl http://localhost:37999/health
```

CI does not build this image. There is no published image.
