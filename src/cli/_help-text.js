// Auto-extracted from src/cli/commands/index.js - help/usage text.

/**
 * The help text shown by the top-level CLI command.
 */
export const HELP_TEXT = `rule-mcp - MCP server for the rule-mcp-* skill ecosystem.

Usage:
  rule-mcp <command> [options]

Commands:
  serve [opts]           Start MCP server (stdio or SSE)
    --transport <type>     Transport type: stdio (default) or sse
    --ssl-cert <path>      TLS certificate (requires --ssl-key)
    --ssl-key <path>       TLS private key (requires --ssl-cert)

  dev [opts]           Start MCP server (stdio)
                        On-demand from repo: pnpm dev
                        Agent spawns via mcp.json -> no pre-start needed
                        Prints mcp.json config for agent setup

  up [opts]            Start SSE server (alias for \`serve --transport sse\`)
                        On-demand HTTP daemon: pnpm up
                        Pre-start, then connect agent to http://127.0.0.1:{port}/sse

  daemon <action>        Manage daemon (process or native service)
    start|stop|status|logs           Process-based daemon
    install|uninstall|enable|disable Native service (macOS: LaunchAgent)
    Port: dynamic (first free port in range 3000-6000)

  install --agent <n>    Install into agent/IDE config (Terminal UI by default)
    --agent <name>         One of: claude, codex, cursor, copilot, gemini,
                           cline, roo, zed, opencode, antigravity, kilo,
                           kimi, vibe, vscode, devin, pi
    --mode <name>          stdio (default), daemon (SSE), or docker
    --global               Use clean command (requires global install)
    --force                Override existing config
    --dry-run              Preview without writing
    --json                 Print machine-readable JSON

  uninstall --agent <n>  Remove from agent/IDE config (Terminal UI by default)
    --agent <name>         Agent name (same as install)
    --dry-run              Preview without removing
    --json                 Print machine-readable JSON

  config [opts]          Print mcp.json config snippet
    --mode <name>          stdio (default), daemon (SSE), or docker
    --global               Uses clean \`rule-mcp\` command

  tools <sub> [args]     List or call MCP tools
    tools list             List all registered tools as Terminal UI
    tools list --json      Export registered tools as JSON
    tools call <name> --json '{...}'   Call a tool directly

  doctor [opts]         System health check (Terminal UI by default)
    --json                 Print machine-readable JSON
    --json-out <path>      Export JSON to a file and keep Terminal UI
    --telemetry            Include anonymous usage stats

  skills <action>        Manage skills
    skills install          Interactive installer (checkbox UI)
    skills list             List available skills as Terminal UI
    skills list --json      Export available skills as JSON
    skills reload           Reload skills from disk (flush cache)

  adr <action> <args>    Architecture Decision Records
    adr new "<title>"       Create a new ADR
      --status <s>          proposed | accepted (default) | deprecated | superseded
      --context "..."       Context forcing factors
      --decision "..."      Decision made and why
      --consequences "..."  Positive/negative outcomes
      --tags "tag1,tag2"    Comma-separated tags (default: architecture)

  fix [opts]             Validate and auto-fix file tree structure
    --dir <path>           Project root (default: .)
    --src-dir <path>       Source directory (default: src)
    --mode <m>             lint (default) | fix | generate
    --dry-run              Preview fixes without applying

  handoff [opts]         Generate LLM context handoff summary
    --dir <path>           Project root (default: .)
    --format <f>           full (default) | brief | minimal
    --compress             Aggressively compress output

  completions [opts]     Generate shell completion script
    --shell <s>            zsh (default) | bash | fish

  help |-h | --help      Show this help message

Aliases:
  rule-mcp <command> --help    Show per-command help

Examples:
  rule-mcp help
  pnpm start / pnpm dev           # STDIO - spawnable by IDE/agent via mcp.json
  pnpm up                          # SSE - on-demand HTTP daemon from repo
  rule-mcp serve --transport sse
  rule-mcp tools list
  rule-mcp doctor --telemetry
  rule-mcp adr new "Use PostgreSQL" --status accepted --tags database
  rule-mcp handoff --compress | pbcopy
  rule-mcp completions --shell zsh > ~/.zsh/completions/_rule-mcp
  rule-mcp config --global

Install modes:
  local (default)    Uses node + script path - works without global install
  --global           Clean command - needs the installer launcher on PATH (./scripts/install.sh)

Universal installer:
  ./scripts/install.sh             Auto-detect + configure all agents
  ./scripts/install.sh --models    Also configure model API keys
  ./scripts/install.sh --help      Full options

Windows:
  .\\scripts\\install.ps1          Auto-detect + configure all agents`;
