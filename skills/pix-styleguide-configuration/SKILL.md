---
name: pix-styleguide-configuration
description: >-
  Use when setting up base project configuration files. Covers .gitignore, .editorconfig, .nvmrc, .env.example, README, LICENSE, and CONTRIBUTING.
tags:
  - "styleguide"
  - "project"
  - "config"
  - "gitignore"
  - "editorconfig"
  - "nvmrc"
  - "repository"
  - "scaffolding"
frameworks: [all]
---

# pix-styleguide-configuration - Base Project Configuration

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

## package.json: the manifest policy lives with pnpm

The fields that must never appear in a `package.json` - `packageManager`,
`devEngines.packageManager` and `engines` - are documented, with the reason,
in [pix-toolchain-pnpm](../pix-toolchain-pnpm/SKILL.md), which owns the
`pkg-no-corepack` and `pkg-no-engines` rules. This skill does not repeat them.

## How to scaffold

1. Run `pix_tool_styleguide mode=scaffold` to see all config file templates, or
   `pix_tool_styleguide mode=scaffold file=.prettierrc` for a single file. The
   scaffold mode is exposed by `pix-styleguide`, which also holds the verbatim
   templates; moving it to this skill is planned.
2. Create/paste each file at the project root.
3. Run `pix_tool_check` to validate the files are present.

---

## See also

- [pix](../pix/SKILL.md) - Central skill index and dispatcher
- [pix-styleguide](../pix-styleguide/SKILL.md) - Style guides index
- [pix-toolchain](../pix-toolchain/SKILL.md) - Toolchain skill index
- [COMPILER.md](../pix-styleguide-typescript/COMPILER.md) - the tsconfig this skill no longer duplicates
- [pix-devops-docker](../pix-devops-docker/SKILL.md) - Docker configuration
- [pix-devops-testing](../pix-devops-testing/SKILL.md) - Testing setup
