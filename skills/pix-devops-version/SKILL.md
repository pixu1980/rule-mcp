---
name: rule-devops-version
description: >-
  Use when setting up automatic version increment on every commit. Covers Husky pre-commit hooks, package.json version management, and version automation.
tags:
  - "devops"
  - "version"
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# Version Management

## Step 1 - Install Husky and lint-staged

Add the required development dependencies:

```bash
pnpm add -D husky lint-staged
```

## Step 2 - Initialize Husky

Create the Husky configuration:

```bash
pnpm exec husky init
```

This creates:

- `.husky/` directory
- `package.json` script: `"prepare": "husky"`

## Step 3 - Configure pre-commit hook

Create `.husky/pre-commit` with the following content:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Increment patch version
pnpm version patch --no-git-tag-version

# Add updated package files
git add package.json package-lock.json

# Run type checking
pnpm run type-check

# Run lint-staged
pnpx lint-staged
```

Make the hook executable:

```bash
chmod +x .husky/pre-commit
```

## Step 4 - Configure lint-staged

Add lint-staged configuration to `package.json`:

```json
{
  "lint-staged": {
    "*.{js,ts,tsx}": ["biome check --apply", "biome format --write"],
    "*.{json,md,yml,yaml}": ["biome format --write"]
  }
}
```

## Step 5 - Add required scripts

Ensure `package.json` has these scripts:

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "prepare": "husky",
    "lint": "biome check .",
    "format": "biome format --write ."
  }
}
```

## Step 6 - Verify the setup

Test the pre-commit hook:

```bash
# Make a small change to a file
echo "// test" >> src/index.ts

# Stage and commit
git add src/index.ts
git commit -m "test: verify version increment"
```

Check that:

1. The version in `package.json` was incremented (patch version)
2. `package.json` and `package-lock.json` were automatically added to the commit
3. Type checking and linting ran successfully

## Step 7 - Configure for different environments

### For monorepos

Update the pre-commit hook to handle multiple packages:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Increment root version
pnpm version patch --no-git-tag-version

# Update all workspace packages
pnpm -r exec pnpm version patch --no-git-tag-version

# Add all package files
git add package.json package-lock.json pnpm-lock.yaml
git add packages/*/package.json

# Run type checking
pnpm -r exec pnpm run type-check

# Run lint-staged
pnpx lint-staged
```

### For projects without type checking

Remove the `pnpm run type-check` line from the pre-commit hook if the project doesn't have TypeScript or type checking.

## Edge cases

- **CI/CD environments**: Pre-commit hooks don't run in CI. Version increment only happens on local commits.
- **Force pushes**: If you force push, version numbers might not be sequential. Consider using semantic-release for automated releases.
- **Merge commits**: Pre-commit hooks don't run on merge commits. Version increments only happen on feature branch commits.
- **Amended commits**: If you amend a commit, the version will be incremented again. Use with care.

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-architect](../rule-architect/SKILL.md) - Project architecture wizard
