---
name: rule-toolchain-project
description: >-
  Use when setting up base project configuration files. Covers .gitignore, .editorconfig, .nvmrc, .env.example, README, LICENSE, and CONTRIBUTING.
tags:
  - "project"
  - "config"
  - "gitignore"
  - "editorconfig"
  - "nvmrc"
  - "repository"
  - "scaffolding"
frameworks: [all]
---

# rule-toolchain-project - Base Project Configuration

## .gitignore

Standard gitignore covering OS, Node.js, build output, env, and IDE files:

```gitignore
# --- OS ---
.DS_Store
Desktop.ini
Thumbs.db

# --- Node ---
node_modules/
npm-debug.log*
pnpm-debug.log*
lerna-debug.log*
.turbo/

# --- Build ---
dist/
build/
.next/
.nuxt/
.out/
.cache/

# --- Env ---
.env
.env.local
.env.*.local

# --- IDE ---
.idea/
.vscode/*.local
*.swp
*.swo
*~

# --- Testing ---
coverage/
.nyc_output/

# --- Misc ---
*.log
*.tsbuildinfo
```

## .editorconfig

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false

[*.{png,jpg,jpeg,gif,webp,ico}]
insert_final_newline = false
```

## .nvmrc

```
lts/*
```

## .env.example

```
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Auth
JWT_SECRET=change-me

# API
API_BASE_URL=http://localhost:3000/api

# (prefix with VITE_ for frontend env vars)
VITE_API_BASE_URL=http://localhost:3000/api
```

## Repository health files

- `README.md` - project name, description, quick start, prerequisites, scripts
- `LICENSE` - MIT by default for open-source
- `CONTRIBUTING.md` - branch policy, commit convention, PR process

## Framework Configuration Files

### .prettierrc

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 120,
  "tabWidth": 2
}
```

### .eslintrc.json (Legacy - prefer Biome for new projects)

```json
{
  "env": { "browser": true, "es2024": true, "node": true },
  "extends": ["eslint:recommended"],
  "parserOptions": { "ecmaVersion": "latest", "sourceType": "module" },
  "rules": {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"]
  }
}
```

### tsconfig.json (Frontend)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### jsconfig.json (JavaScript)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "checkJs": true,
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "noEmit": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### .nvmrc

```
lts/*
```

## package.json: never a corepack activation field

Three fields must never appear in a `package.json`:

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

`packageManager` and `devEngines.packageManager` hand the install to corepack;
`engines` gives npm, pnpm or yarn a range to warn or refuse on. rule-mcp
does not support either: the install must not be something a tool can decline on
a machine the project cannot see. Pin Node with `.nvmrc` and the dependency tree
with the lockfile. Guardrails: `pkg-no-corepack`, `pkg-no-engines` (owned by
[rule-toolchain-pnpm](../rule-toolchain-pnpm/SKILL.md), applied to every check).

## How to scaffold

1. Run `rule_tool_toolchain_project mode=scaffold` to see all config file templates.
2. Or call `rule_tool_styleguide mode=scaffold file=.prettierrc` for a single file.
3. Create/paste each file at the project root.
4. Run `rule_tool_check` to validate the files are present.

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-toolchain](../rule-toolchain/SKILL.md) - Toolchain skill index
- [rule-devops-docker](../rule-devops-docker/SKILL.md) - Docker configuration
- [rule-devops-testing](../rule-devops-testing/SKILL.md) - Testing setup
