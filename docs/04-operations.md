# Tools and operations

How to operate this server: the tool surface in one pointer, then plugins,
release and troubleshooting. Installing it is [01 getting started](./01-getting-started.md).

## Tool and prompt reference

The tool, prompt and resource lists are generated from the running server by
`pnpm census`, so they cannot drift from what it actually registers. They are
never hand-edited; this document points at them instead of restating them.

- Every tool, with its schema and modes: [09-tools.md](./09-tools.md)
- Every prompt and its arguments: [10-prompts.md](./10-prompts.md)
- Every `pix://` resource URI: [15-resources.md](./15-resources.md)
- What each skill covers: [08-skills.md](./08-skills.md)

## Plugins

### Overview

Any directory in `~/.agents/skills/` with a `SKILL.md` file is auto-detected as a skill.

- **Official pix skills** start with `pix-` (e.g., `pix-frontend-react`, `pix-frontend-vue`)
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
pix-galaxy-mcp skills reload

# 4. Your plugin is now available as:
pix-galaxy-mcp tools call pix_tool_styleguide --json '{"mode": "full"}'
```

### Adding custom guardrails with plugin.js

For advanced plugins, create a `plugin.js` file in your plugin directory:

```javascript
// ~/.agents/skills/my-custom-rules/plugin.js
/**
 * @module my-custom-rules/plugin
 * Optional plugin.js for custom guardrails and generators.
 */

/** Custom guardrails to add to the pix_tool_check engine. */
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
└── pix-frontend-react/                ← Official pix skills coexist
    └── SKILL.md
```

### How plugins are detected

1. On startup (or `skills reload`), the server scans `~/.agents/skills/` and `skills/` (embedded)
2. Any directory with a `SKILL.md` file is registered as a skill
3. If the directory also has `plugin.js`, it's dynamically imported
4. The plugin's guardrails are merged into the guardrails engine
5. The plugin is registered as an MCP tool: `pix_<plugin-name>`

### Community skills

The `pix://community` resource lists all installed plugins:

```bash
pix-galaxy-mcp tools call pix --json '{"prompt": "List available community skills"}'
# Or directly via MCP resource:
# pix://community
```

### Best practices

- **Plugin names**: use `kebab-case` (e.g., `my-company-rules`)
- **SKILL.md**: include YAML frontmatter with `name` and `description`
- **Guardrail IDs**: prefix with your plugin name to avoid conflicts (e.g., `myco-two-spaces`)
- **Test your plugin**: run `pix_tool_check skill=<plugin-name>` to verify guardrails work

## Release

### 1. Repository Setup

```bash
cd /Users/emilianopisu/Projects/ai/pix-galaxy-mcp

# Initialize git
git init
git add -A
git commit -m "feat: initial release v0.1.0"

# Add remote
git remote add origin https://github.com/pix/pix-galaxy-mcp

# Push
git branch -M main
git push -u origin main
```

---

### 2. Configure GitHub Secrets

Go to **GitHub → pix-galaxy-pix-galaxy-mcp → Settings → Secrets and variables → Actions** and add:

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
git tag -s v0.1.0
git push origin v0.1.0
```

The tag must be signed (`-s`): the release workflow refuses lightweight
tags. Set up signing once per machine (see CONTRIBUTING.md).

The release pipeline (`.github/workflows/release.yml`) runs automatically:

| Step                | Action                                                                |
| ------------------- | --------------------------------------------------------------------- |
| ✅ npm publish      | Publish to npmjs.com with provenance                                  |
| ✅ Docker build     | Multi-arch (linux/amd64 + linux/arm64) → `ghcr.io/pix/pix-galaxy-mcp` |
| ✅ Homebrew formula | Generate `.rb` and attach to GitHub Release                           |
| ✅ GitHub Release   | Create release with `.tgz` + assets                                   |

---

### 5. Homebrew Tap Configuration

To enable `brew install pix/tap/pix-galaxy-mcp`:

```bash
# Create the tap repo
# Go to https://github.com/new → create: pix-galaxy-homebrew-tap

# Clone, copy the generated formula, push
git clone https://github.com/pix/homebrew-tap
cp pix-galaxy-mcp.rb homebrew-tap/Formula/
cd homebrew-tap
git add Formula/pix-galaxy-mcp.rb
git commit -m "feat: add pix-galaxy-mcp v0.1.0"
git push
```

---

### 6. User Installation

Users can install using these methods:

| Method               | Command                                                           |
| -------------------- | ----------------------------------------------------------------- |
| **Clone + launcher** | `git clone` + `./scripts/install.sh`                              |
| **pnpx**             | `pnpx pix-galaxy-mcp serve`                                       |
| **Homebrew**         | `brew install pix/tap/pix-galaxy-mcp`                             |
| **Docker**           | `docker pull ghcr.io/pix/pix-galaxy-mcp`                          |
| **Winget**           | `winget install pix.pix-galaxy-mcp`                               |
| **Scoop**            | `scoop bucket add pix-galaxy-mcp && scoop install pix-galaxy-mcp` |
| **GitHub Release**   | Direct `.tgz` download                                            |

#### Agent command artifacts

`install --agent <name>` installs MCP config plus host-native reusable entry point where verified:

| Agent              | Artifact                                    | Invocation                                             |
| ------------------ | ------------------------------------------- | ------------------------------------------------------ |
| Pi                 | `~/.pi/agent/prompts/pix-galaxy-mcp.md`     | `/pix-galaxy-mcp`                                      |
| Claude Code        | `~/.claude/commands/pix-galaxy-mcp.md`      | `/pix-galaxy-mcp`                                      |
| Gemini CLI         | `~/.gemini/commands/pix-galaxy-mcp.toml`    | `/pix-galaxy-mcp`                                      |
| Cursor             | `.cursor/commands/pix-galaxy-mcp.md`        | `/pix-galaxy-mcp`                                      |
| GitHub Copilot CLI | `~/.copilot/agents/pix-galaxy-mcp.agent.md` | `/agent` selection                                     |
| Codex CLI          | `~/.agents/skills/pix/`                     | Skill workflow; no stable exact custom command assumed |

Uninstall removes same artifact. Universal command body forces routing, evidence lookup, test-first implementation, blocking `pix_tool_check`, real test reporting, and ADR capture.

---

### 7. Post-Release Verification

```bash
# Test the clone install
git clone https://github.com/pixu1980/pix-galaxy-mcp.git
cd pix-galaxy-mcp
./scripts/install.sh
pix-galaxy-mcp doctor
pix-galaxy-mcp install --agent all

# Test Docker
docker pull ghcr.io/pix/pix-galaxy-mcp
docker compose up -d
curl http://localhost:37999/health

# Test tools
pix-galaxy-mcp tools list
pix-galaxy-mcp tools call pix_tool_detect --json '{}'
pix-galaxy-mcp tools call pix --json '{"prompt": "React button"}'

# Verify a release tarball (every GitHub Release attaches both files)
curl -fsSLO https://github.com/pixu1980/pix-galaxy-mcp/releases/download/<tag>/pix-galaxy-mcp-<version>.tgz
curl -fsSLO https://github.com/pixu1980/pix-galaxy-mcp/releases/download/<tag>/SHA256SUMS
shasum -a 256 -c SHA256SUMS
```

---

### 8. Subsequent Releases

```bash
# Bump version (single writer for package.json, server.json, CHANGELOG.md)
node scripts/build/version/index.mjs --apply 0.1.0
node scripts/build/version/index.mjs --check

git add -A && git commit -m "chore(release): 0.1.0" && git tag -s v0.1.0
git push --follow-tags
```

The release pipeline triggers automatically on tag `v*.*.*`.

---

### Release Pipeline Architecture

```
Tag vX.Y.Z
    │
    ├─► build: version/audit gates → pnpm build → tarball + SHA256SUMS (artifact)
    │
    ├─► verify: checksum check → scratch npm install → bin runs
    │
    └─► release: attach tarball + SHA256SUMS to the GitHub Release
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
- Winget: `.github/winget/pix-galaxy.pix-galaxy-mcp.yaml`
- Scoop: `.github/scoop/pix-galaxy-mcp.json`
- Server manifest: `server.json`
- Changelog: `CHANGELOG.md`

## Troubleshooting

### Quick diagnostics

```bash
# Run the health check
pix-galaxy-mcp doctor

# List all available tools
pix-galaxy-mcp tools list

# Test a specific tool
pix-galaxy-mcp tools call pix --json '{"prompt": "test"}'

# Check daemon status
pix-galaxy-mcp daemon status

# View daemon logs
pix-galaxy-mcp daemon logs
```

### Agent-specific issues

#### Claude (Claude Code / Claude Desktop)

**Issue**: Tool not found by Claude.

- **Fix**: Ensure `~/.claude.json` has the `pix-galaxy-mcp` entry.
  ```bash
  pix-galaxy-mcp install --agent claude
  ```
- **Verify**: The file should contain:
  ```json
  {
    "mcpServers": {
      "pix-galaxy-mcp": {
        "command": "/path/to/node",
        "args": ["/path/to/bin/pix-galaxy-mcp.js", "serve"]
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
  pix-galaxy-mcp install --agent cursor
  ```
- **Known limitation**: Cursor requires the MCP server to be available at IDE startup. If you install while Cursor is running, restart Cursor.

#### VS Code

**Issue**: VS Code doesn't detect the MCP server.

- **Fix**: The config goes into `.vscode/mcp.json` in your project root.
  ```bash
  cd your-project
  pix-galaxy-mcp install --agent vscode
  ```
- **Verify**: `.vscode/mcp.json` in your project root should contain:
  ```json
  {
    "servers": {
      "pix-galaxy-mcp": {
        "type": "stdio",
        "command": "/path/to/node",
        "args": ["/path/to/bin/pix-galaxy-mcp.js", "serve"]
      }
    }
  }
  ```

#### GitHub Copilot

**Issue**: Copilot doesn't support custom MCP servers directly.

- **Fix**: Copilot uses a different integration path. Copy the instructions from:
  ```bash
  pix-galaxy-mcp install --agent copilot --dry-run
  ```
  The generated instructions file explains how to configure Copilot.

#### Pi (pi.dev)

**Issue**: pi doesn't auto-discover the MCP server.

- **Fix**: Ensure `~/.pi/agent/mcp.json` has the entry:
  ```bash
  pix-galaxy-mcp install --agent pi
  ```

### Daemon mode

**Issue**: Daemon fails to start (port in use).

- **Fix**: Check if another instance is running:
  ```bash
  pix-galaxy-mcp daemon status
  lsof -i :37999
  ```
- **Kill the existing process**:
  ```bash
  pix-galaxy-mcp daemon stop
  # Or manually: kill $(cat ~/.pix-galaxy-mcp/state/daemon.pid)
  ```

**Issue**: Daemon started but health check fails.

- **Debug**: Check the daemon log:
  ```bash
  cat ~/.pix-galaxy-mcp/state/daemon.log
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
  pix-galaxy-mcp skills reload
  ```

**Issue**: `pix_tool` returns no matching skill.

- **Verify**: Skills are loaded:
  ```bash
  pix-galaxy-mcp tools list | grep pix-galaxy
  ```
- **Try**: Use `pix_tool_search` for free-text search across all skills.

### General debugging

| Symptom                             | Likely cause           | Fix                                                |
| ----------------------------------- | ---------------------- | -------------------------------------------------- |
| `command not found: pix-galaxy-mcp` | Not installed globally | `git clone` + `./scripts/install.sh`               |
| `Cannot find module`                | Node.js < 20           | Upgrade to Node.js 20+                             |
| `ECONNREFUSED` on port 37999        | Daemon not running     | `pix-galaxy-mcp daemon start`                      |
| Tools return 0 results              | Skills not loaded      | `pix-galaxy-mcp skills reload`                     |
| `ZodError` in tool output           | Invalid arguments      | Check tool schema with `pix-galaxy-mcp tools list` |
