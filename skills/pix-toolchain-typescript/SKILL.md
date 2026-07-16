---
name: pix-toolchain-typescript
description: >-
  Use when configuring TypeScript compiler options. Covers tsconfig.json, strict mode, path aliases, declaration files, and build strategies.
tags:
  - "typescript"
  - "tsc"
  - "compiler"
  - "tsconfig"
  - "types"
  - "toolchain"
  - "strict"
frameworks: [all]
---

# pix-toolchain-typescript — TypeScript Configuration

## Strict Mode (Mandatory)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": false
  }
}
```

## Base tsconfig.json (Frontend)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Base tsconfig.json (Node.js Backend)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Path Aliases

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@services/*": ["src/services/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

## Composite Projects (Monorepo)

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist"
  },
  "references": [
    { "path": "../shared" },
    { "path": "../backend" },
    { "path": "../frontend" }
  ]
}
```

## CLI Commands

```bash
pnpm tsc                  # Type-check
pnpm tsc --noEmit         # Type-check without emitting files
pnpm tsc --build          # Build composite projects
pnpm tsc --watch          # Watch mode
```

## See also

- [pix-toolchain-project](../pix-toolchain-project/SKILL.md) — Base project config
- [pix-toolchain-biome](../pix-toolchain-biome/SKILL.md) — Linting & formatting
- [pix](../pix/SKILL.md) — Central skill index
