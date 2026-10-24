---
name: rule-mcp-toolchain-pnpm
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
guardrails: [pkg-exact-versions, pkg-no-corepack, pkg-no-engines, verified-dependencies-only]
---

# rule-mcp-toolchain-pnpm - pnpm Package Manager

## Why pnpm

- **Disk-efficient**: content-addressable store - one version of a package is saved once
- **Fast**: deterministic resolution, parallel downloads, hard-linked store
- **Strict**: `pnpm-lock.yaml` is deterministic and auditable
- **Workspace-native**: built-in monorepo support with `pnpm-workspace.yaml`

## Exact versions, never a caret range

**Mandatory.** Every entry in `dependencies`, `devDependencies` and
`optionalDependencies` is one exact version. No `^`, no `~`, no comparator, no
alternation, no wildcard, no dist-tag.

```json
{
  "devDependencies": {
    "prettier": "3.9.4"
  }
}
```

```json
{
  "devDependencies": {
    "prettier": "^3.9.4"
  }
}
```

The caret does not only leave prettier free to move. It leaves everything
prettier depends on free to move, and that is where the breakage comes from: two
installs of the same commit, a week apart, resolve different subdependency trees.
The lockfile pins the tree for whoever has the lockfile, and the caret undoes it
the moment anyone runs `pnpm up`, adds a package, or resolves a merge conflict in
the lock.

Make it the default so nobody has to remember:

```ini
# .npmrc
save-exact=true
```

Then `pnpm add prettier` writes `"3.9.4"` and `pnpm add --save-exact` is what it
already does. When converting an existing range to an exact pin, bump to the
latest published release and run the test suite: exact-latest is the default
policy (it keeps security patches flowing), and staying on an older version is
the documented exception, not the habit. Overrides in `pnpm-workspace.yaml`
follow the same rule: exact versions, latest release. Opt out of the policy
line with `RULE_MCP_LOOSE_DEPS=1` when a project manages versions
elsewhere.

`peerDependencies` are the exception and stay ranges. A peer range states which
versions a library is compatible with; it installs nothing, so pinning it is a
false claim that only one version works.

Guardrail: `pkg-exact-versions`.

## No packageManager, no engines, no corepack

**Mandatory.** None of these fields goes in a `package.json`:

```json
{
  "packageManager": "pnpm@11.25.0",
  "engines": {
    "node": ">=22"
  },
  "devEngines": {
    "packageManager": { "name": "pnpm", "version": "11.8.0", "onFail": "download" }
  }
}
```

`packageManager` and `devEngines.packageManager` activate corepack. rule-mcp
chooses not to support that: corepack gets a vote on whether the install runs at
all. It downloads a package manager on a machine that is offline, verifies a
signature from behind a proxy that rewrites it, and shadows the pnpm already on
the PATH with a shim that reports a different version. What it buys is an
assertion about a version, and `.nvmrc` plus `pnpm-lock.yaml` already give that,
without a component in the middle that can refuse.

`engines` is the same policy reached another way. npm, pnpm and yarn warn or
refuse when the running Node falls outside the declared range, so the field is a
second place the install can be declined for a reason that belongs to the
machine, not to the project. The Node floor goes in `.nvmrc`, in the installer
and in CI, where a person reads it and nothing acts on it during an install.

State the package manager where a human reads it - the README, the contributing
guide, the CI job - not where a tool will act on it.

Guardrails: `pkg-no-corepack`, `pkg-no-engines`. The write path removes the
fields from a generated manifest before it checks it, so a model that writes
them gets a receipt for the cleaned file and not for what it sent.

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

- [rule-mcp-toolchain-vite](../rule-mcp-toolchain-vite/SKILL.md) - Vite build tool
- [rule-mcp](../rule-mcp/SKILL.md) - Central skill index
