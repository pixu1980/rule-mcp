# Tools and operations

How to operate this server: the tool surface in one pointer, then plugins,
release and troubleshooting. Installing it is [01 getting started](./GETTING_STARTED.md).

## Tool and prompt reference

The tool, prompt and resource lists are generated from the running server by
`pnpm census`, so they cannot drift from what it actually registers. They are
never hand-edited; this document points at them instead of restating them.

- Every tool, with its schema and modes: [07-tools.md](./07-tools.md)
- Every prompt and its arguments: [08-prompts.md](./08-prompts.md)
- Every `rule://` resource URI: [13-resources.md](./13-resources.md)
- What each skill covers: [06-skills.md](./06-skills.md)

## Plugins

### Overview

Any directory in `~/.agents/skills/` with a `SKILL.md` file is auto-detected as a skill.

- **Official rule skills** start with `rule-` (e.g., `rule-frontend-react`, `rule-frontend-vue`)
- **Community/plugin skills** can use any name (e.g., `my-company-rules`)

Plugins are automatically registered as MCP tools (`pix_<plugin-name>`) and support
all standard skill tool modes: `full`, `summary`, `search`, `guardrails`, `check`.

### Creating a basic plugin

```bash
# 1. Create the plugin directory
mkdir -p ~/.agents/skills/my-custom-rules

# 2. Create SKILL.md
cat > ~/.agents/skills/my-custom-rules/SKILL.md << 'EOF'
---
name: my-custom-rules
description: Custom project rules
---

# my-custom-rules

## Rules

- Use 2-space indentation
- Max line length: 100 characters
EOF

# 3. Reload skills
rule-mcp skills reload

# 4. Your plugin is now available as:
rule-mcp tools call rule_tool_styleguide --json '{"mode": "full"}'
```

### Adding custom guardrails with plugin.js

For advanced plugins, create a `plugin.js` file in your plugin directory:

```javascript
// ~/.agents/skills/my-custom-rules/plugin.js
/**
 * @module my-custom-rules/plugin
 * Optional plugin.js for custom guardrails and generators.
 */

/** Custom guardrails to add to the rule_tool_check engine. */
export const guardrails = [
  {
    id: "custom-two-spaces",
    label: "2-space indentation",
    description: "Code must use 2-space indentation.",
    check: (code) => {
      const twoSpaceIndent = code.match(/^(\s{2})[^\s]/gm);
      return {
        pass: !twoSpaceIndent || twoSpaceIndent.length === 0,
        failCount: twoSpaceIndent?.length || 0,
        detail: twoSpaceIndent ? twoSpaceIndent.slice(0, 5) : [],
        suggestion: "Use 2-space indentation instead of 4.",
      };
    },
  },
];

/** Custom generators (future use). */
export const generators = {
  configFile: () => "// Custom config\n",
};
```

### Plugin directory structure

```
~/.agents/skills/
├── my-custom-rules/          ← Plugin name (any valid directory name)
│   ├── SKILL.md              ← Required: skill content (YAML frontmatter + markdown)
│   └── plugin.js             ← Optional: custom guardrails & generators
├── my-company-rules/
│   ├── SKILL.md
│   └── plugin.js
└── rule-frontend-react/                ← Official rule skills coexist
    └── SKILL.md
```

### How plugins are detected

1. On startup (or `skills reload`), the server scans `~/.agents/skills/` and `skills/` (embedded)
2. Any directory with a `SKILL.md` file is registered as a skill
3. If the directory also has `plugin.js`, it's dynamically imported
4. The plugin's guardrails are merged into the guardrails engine
5. The plugin is registered as an MCP tool: `pix_<plugin-name>`

### Community skills

The `rule://community` resource lists all installed plugins:

```bash
rule-mcp tools call rule --json '{"prompt": "List available community skills"}'
# Or directly via MCP resource:
# rule://community
```

### Best practices

- **Plugin names**: use `kebab-case` (e.g., `my-company-rules`)
- **SKILL.md**: include YAML frontmatter with `name` and `description`
- **Guardrail IDs**: prefix with your plugin name to avoid conflicts (e.g., `myco-two-spaces`)
- **Test your plugin**: run `rule_tool_check skill=<plugin-name>` to verify guardrails work

## Release

### 1. Repository Setup

```bash
cd /Users/emilianopisu/Projects/ai/rule-mcp

# Initialize git
git init
git add -A
git commit -m "feat: initial release v0.1.0"

# Add remote
git remote add origin https://github.com/rule/rule-mcp

# Push
git branch -M main
git push -u origin main
```

---

### 2. Configure GitHub Secrets

Go to **GitHub → rule-mcp-rule-mcp → Settings → Secrets and variables → Actions** and add:

| Secret      | Value                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `NPM_TOKEN` | npm access token (create at [npmjs.com](https://www.npmjs.com/settings/~/tokens) with type **Automation** and scope **publish**) |

`GITHUB_TOKEN` is automatic - no configuration needed.

---

### 3. Verify CI

After the first push to `main`, CI starts automatically:

- **Lint job**: syntax check + ESLint + Prettier
- **Test job**: 6 combinations (ubuntu × node20/22, macos × node20/22, windows × node20/22)
- **Audit job**: `pnpm audit --prod`

Check: **GitHub → Actions → ci**

---

### 4. First Release (v0.1.0)

Create a tag to trigger the release pipeline:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release pipeline (`.github/workflows/release.yml`) runs automatically:

| Step                | Action                                                                |
| ------------------- | --------------------------------------------------------------------- |
| ✅ npm publish      | Publish to npmjs.com with provenance                                  |
| ✅ Docker build     | Multi-arch (linux/amd64 + linux/arm64) → `ghcr.io/rule/rule-mcp` |
| ✅ Homebrew formula | Generate `.rb` and attach to GitHub Release                           |
| ✅ GitHub Release   | Create release with `.tgz` + assets                                   |

---

### 5. Homebrew Tap Configuration

To enable `brew install rule/tap/rule-mcp`:

```bash
# Create the tap repo
# Go to https://github.com/new → create: rule-mcp-homebrew-tap

# Clone, copy the generated formula, push
git clone https://github.com/rule/homebrew-tap
cp rule-mcp.rb homebrew-tap/Formula/
cd homebrew-tap
git add Formula/rule-mcp.rb
git commit -m "feat: add rule-mcp v0.1.0"
git push
```

---

### 6. User Installation

Users can install using these methods:

| Method             | Command                                                           |
| ------------------ | ----------------------------------------------------------------- |
| **pnpm/pnpm**      | `pnpm add -g rule-mcp`                                      |
| **pnpx**           | `pnpx rule-mcp serve`                                       |
| **Homebrew**       | `brew install rule/tap/rule-mcp`                             |
| **Docker**         | `docker pull ghcr.io/rule/rule-mcp`                          |
| **Winget**         | `winget install rule.rule-mcp`                               |
| **Scoop**          | `scoop bucket add rule-mcp && scoop install rule-mcp` |
| **GitHub Release** | Direct `.tgz` download                                            |

#### Agent command artifacts

`install --agent <name>` installs MCP config plus host-native reusable entry point where verified:

| Agent              | Artifact                                    | Invocation                                             |
| ------------------ | ------------------------------------------- | ------------------------------------------------------ |
| Pi                 | `~/.pi/agent/prompts/rule-mcp.md`     | `/rule-mcp`                                      |
| Claude Code        | `~/.claude/commands/rule-mcp.md`      | `/rule-mcp`                                      |
| Gemini CLI         | `~/.gemini/commands/rule-mcp.toml`    | `/rule-mcp`                                      |
| Cursor             | `.cursor/commands/rule-mcp.md`        | `/rule-mcp`                                      |
| GitHub Copilot CLI | `~/.copilot/agents/rule-mcp.agent.md` | `/agent` selection                                     |
| Codex CLI          | `~/.agents/skills/rule/`                     | Skill workflow; no stable exact custom command assumed |

Uninstall removes same artifact. Universal command body forces routing, evidence lookup, test-first implementation, blocking `rule_tool_check`, real test reporting, and ADR capture.

---

### 7. Post-Release Verification

```bash
# Test pnpm
pnpm add -g rule-mcp
rule-mcp doctor
rule-mcp install --agent all

# Test Docker
docker pull ghcr.io/rule/rule-mcp
docker compose up -d
curl http://localhost:37999/health

# Test tools
rule-mcp tools list
rule-mcp tools call rule_tool_detect --json '{}'
rule-mcp tools call rule --json '{"prompt": "React button"}'
```

---

### 8. Subsequent Releases

```bash
# Bump version
pnpm version patch   # 0.1.0 → 0.1.1
# pnpm version minor  # 0.1.0 → 0.2.0
# pnpm version major  # 0.1.0 → 1.0.0

git push --follow-tags
```

The release pipeline triggers automatically on tag `v*.*.*`.

---

### Release Pipeline Architecture

```
Tag v0.2.0
    │
    ├─► publish-pnpm: pnpm publish --provenance
    │
    ├─► docker: buildx (amd64+arm64) → ghcr.io
    │
    ├─► homebrew: package.sh → formula .rb → release asset
    │
    └─► github-release: pnpm pack → .tgz → release assets
```

---

### Secrets / Tokens Summary

| Service         | Required                 | Where to create                                                                                                      |
| --------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **npm**         | `NPM_TOKEN` (Automation) | [npmjs.com tokens](https://www.npmjs.com/settings/~/tokens)                                                          |
| **GitHub**      | `GITHUB_TOKEN` (auto)    | Already present - permissions: `contents: write`, `id-token: write`, `packages: write` (configured in `release.yml`) |
| **Docker GHCR** | None                     | Login via `GITHUB_TOKEN` - already configured via `docker/login-action@v3`                                           |

Everything else is already configured in existing workflows:

- CI: `.github/workflows/ci.yml`
- Release: `.github/workflows/release.yml`
- Docker: `Dockerfile` + `docker-compose.yml`
- Winget: `.github/winget/rule-mcp.rule-mcp.yaml`
- Scoop: `.github/scoop/rule-mcp.json`
- Server manifest: `server.json`
- Changelog: `CHANGELOG.md`

## Troubleshooting

### Quick diagnostics

```bash
# Run the health check
rule-mcp doctor

# List all available tools
rule-mcp tools list

# Test a specific tool
rule-mcp tools call rule --json '{"prompt": "test"}'

# Check daemon status
rule-mcp daemon status

# View daemon logs
rule-mcp daemon logs
```

### Agent-specific issues

#### Claude (Claude Code / Claude Desktop)

**Issue**: Tool not found by Claude.

- **Fix**: Ensure `~/.claude.json` has the `rule-mcp` entry.
  ```bash
  rule-mcp install --agent claude
  ```
- **Verify**: The file should contain:
  ```json
  {
    "mcpServers": {
      "rule-mcp": {
        "command": "/path/to/node",
        "args": ["/path/to/bin/rule-mcp.js", "serve"]
      }
    }
  }
  ```

**Issue**: Claude says "Tool not available" after install.

- **Fix**: Restart Claude Code. MCP servers are loaded at startup.
- **Debug**: Check `~/.claude.log` for connection errors.

#### Cursor

**Issue**: MCP server not connecting.

- **Fix**: Check `~/.cursor/mcp.json` exists and is valid JSON.
  ```bash
  rule-mcp install --agent cursor
  ```
- **Known limitation**: Cursor requires the MCP server to be available at IDE startup. If you install while Cursor is running, restart Cursor.

#### VS Code

**Issue**: VS Code doesn't detect the MCP server.

- **Fix**: The config goes into `.vscode/mcp.json` in your project root.
  ```bash
  cd your-project
  rule-mcp install --agent vscode
  ```
- **Verify**: `.vscode/mcp.json` in your project root should contain:
  ```json
  {
    "servers": {
      "rule-mcp": {
        "type": "stdio",
        "command": "/path/to/node",
        "args": ["/path/to/bin/rule-mcp.js", "serve"]
      }
    }
  }
  ```

#### GitHub Copilot

**Issue**: Copilot doesn't support custom MCP servers directly.

- **Fix**: Copilot uses a different integration path. Copy the instructions from:
  ```bash
  rule-mcp install --agent copilot --dry-run
  ```
  The generated instructions file explains how to configure Copilot.

#### Pi (pi.dev)

**Issue**: pi doesn't auto-discover the MCP server.

- **Fix**: Ensure `~/.pi/agent/mcp.json` has the entry:
  ```bash
  rule-mcp install --agent pi
  ```

### Daemon mode

**Issue**: Daemon fails to start (port in use).

- **Fix**: Check if another instance is running:
  ```bash
  rule-mcp daemon status
  lsof -i :37999
  ```
- **Kill the existing process**:
  ```bash
  rule-mcp daemon stop
  # Or manually: kill $(cat ~/.rule-mcp/state/daemon.pid)
  ```

**Issue**: Daemon started but health check fails.

- **Debug**: Check the daemon log:
  ```bash
  cat ~/.rule-mcp/state/daemon.log
  ```

**Issue**: SSE connection drops.

- **Check**: The SSE endpoint should return `text/event-stream` content type:
  ```bash
  curl -N http://localhost:37999/sse
  ```
- **Expected**: You should see a `sessionId` event within 1 second.

### Docker

**Issue**: Docker container exits immediately.

- **Fix**: The container needs to be run with stdio mode for MCP agents. Use compose for SSE:
  ```bash
  docker compose up -d
  ```

**Issue**: Can't connect to Docker container.

- **Verify**: Health check should return 200:
  ```bash
  curl http://localhost:37999/health
  ```

### Skills

**Issue**: Skills not loading after update.

- **Fix**: Re-embed skills:
  ```bash
  rule-mcp skills reload
  ```

**Issue**: `pix_tool` returns no matching skill.

- **Verify**: Skills are loaded:
  ```bash
  rule-mcp tools list | grep rule-mcp
  ```
- **Try**: Use `rule_tool_search` for free-text search across all skills.

### General debugging

| Symptom                             | Likely cause           | Fix                                                |
| ----------------------------------- | ---------------------- | -------------------------------------------------- |
| `command not found: rule-mcp` | Not installed globally | `pnpm add -g rule-mcp`                       |
| `Cannot find module`                | Node.js < 20           | Upgrade to Node.js 20+                             |
| `ECONNREFUSED` on port 37999        | Daemon not running     | `rule-mcp daemon start`                      |
| Tools return 0 results              | Skills not loaded      | `rule-mcp skills reload`                     |
| `ZodError` in tool output           | Invalid arguments      | Check tool schema with `rule-mcp tools list` |
