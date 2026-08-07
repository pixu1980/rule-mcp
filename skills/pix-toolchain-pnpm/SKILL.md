---
name: rule-toolchain-pnpm
description: >-
  Use when managing packages with pnpm. Covers workspaces, caching strategies, CI optimization, monorepo patterns, and store management.
tags:
  - "pnpm"
  - "package-manager"
  - "workspace"
  - "monorepo"
  - "dependencies"
  - "toolchain"
  - "nodejs"
frameworks: [all]
---

# rule-toolchain-pnpm - pnpm Package Manager

## Why pnpm

- **Disk-efficient**: content-addressable store - one version of a package is saved once
- **Fast**: deterministic resolution, parallel downloads, hard-linked store
- **Strict**: `pnpm-lock.yaml` is deterministic and auditable
- **Workspace-native**: built-in monorepo support with `pnpm-workspace.yaml`

## Quick Start

```bash
pnpm add -g pnpm    # Install pnpm itself
pnpm init            # Initialize project
pnpm add react       # Install dependency
pnpm run dev         # Run script
```

## pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## Key Commands

| Command             | Description                                 |
| ------------------- | ------------------------------------------- |
| `pnpm add <pkg>`    | Install dependency                          |
| `pnpm add -D <pkg>` | Install dev dependency                      |
| `pnpm add -g <pkg>` | Install globally                            |
| `pnpm remove <pkg>` | Uninstall                                   |
| `pnpm up`           | Update all dependencies                     |
| `pnpm up --latest`  | Update to latest versions                   |
| `pnpm audit`        | Security audit                              |
| `pnpm outdated`     | List outdated packages                      |
| `pnpm dlx <pkg>`    | Run a package without installing (like npx) |
| `pnpm exec <cmd>`   | Execute command in project context          |

## Workspace Commands

```bash
pnpm --filter <package> add <pkg>    # Add dependency to specific workspace package
pnpm --filter <package> run <script> # Run script in specific package
pnpm run -r <script>                # Run script in all packages
pnpm -r <script>                    # Short form for run in all packages
pnpm --filter "...{<package>}..." run build  # Run in package and its dependents
```

## Store Management

```bash
pnpm store status    # Check store integrity
pnpm store prune     # Remove orphaned packages from store
pnpm store path      # Show store path
```

## CI Optimization

```yaml
# .github/workflows/ci.yml - pnpm cache
steps:
  - uses: pnpm/action-setup@v4
  - uses: actions/setup-node@v4
    with:
      cache: "pnpm"
  - run: pnpm install --frozen-lockfile
  - run: pnpm run build
  - run: pnpm run test
```

## Monorepo Best Practices

- Use `"link:"` protocol for internal dependencies - always resolves to workspace
- `pnpm install --frozen-lockfile` in CI - never regenerate lockfile
- `pnpm rebuild` to rebuild native modules after Node.js version change
- Use `.npmrc` with `auto-install-peers=true` for React/TypeScript monorepos

## Migration from npm/yarn

```bash
# npm → pnpm
npm install -g pnpm
pnpm import           # Generate pnpm-lock.yaml from package-lock.json / yarn.lock

# Specific migrations
rm -rf node_modules
pnpm install          # Fresh install with pnpm store
```

## See also

- [rule-toolchain-vite](../rule-toolchain-vite/SKILL.md) - Vite build tool
- [rule](../rule/SKILL.md) - Central skill index
