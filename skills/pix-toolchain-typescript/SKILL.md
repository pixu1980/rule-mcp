---
name: rule-toolchain-typescript
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

# rule-toolchain-typescript - TypeScript Configuration

## Strict Mode (Mandatory)

Strict mode is the floor for a large TypeScript codebase, not the finish line. Keep it explicit even when the installed compiler supplies a newer default so the project remains reproducible across toolchains.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true
  }
}
```

`noUncheckedIndexedAccess` makes undeclared array and map lookups include `undefined`. `exactOptionalPropertyTypes` distinguishes an omitted property from one explicitly set to `undefined`; when enabling it in an existing codebase, migrate call sites incrementally by omitting properties or declaring `| undefined` intentionally.

### Incremental strictness migration

Do not land thousands of type errors in one PR. Enable the baseline globally, then tighten directories or packages incrementally with project references. Track a `type-coverage` percentage in CI and ratchet its minimum upward so typed coverage cannot regress. Use `// @ts-expect-error` only for tracked, temporary exceptions: it reports when the underlying error disappears.

### Version compatibility

Keep `strict` explicit and verify compiler-version-specific behavior in CI. TypeScript 6.x and the TypeScript 7.x release-candidate toolchain change defaults and performance characteristics, but they do not remove the need for explicit project policy. Treat native compiler adoption and version upgrades as separate, measured changes.

## Type Design at Scale

### Make impossible states unrepresentable

Prefer discriminated unions over independent boolean flags when a value has mutually exclusive states. The discriminant makes illegal combinations unrepresentable and gives switches a finite set of cases to handle.

```ts
type RequestState<T> =
  { status: "idle" } | { status: "loading" } | { status: "success"; data: T } | { status: "error"; error: Error };
```

### Consistent type choices

- Use `interface` for public, extensible object contracts.
- Use `type` for unions, intersections, mapped types, and conditional types.
- Use branded types for domain identifiers that share a runtime representation but must not be interchangeable.
- Prefer `unknown over any`: narrow unknown values before use; do not let `any` disable checking and spread through the codebase.
- Use `as const` for literal configuration and lookup tables when widened primitives would lose useful information.

```ts
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };
type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;
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
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
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
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
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

## Boundary Types and Runtime Validation

Keep API responses, database/ORM records, DTOs, and domain entities as distinct types. Reusing one `User` type across every boundary couples unrelated layers and allows a change in one representation to silently affect the others.

Prefer **generated types** for external contracts so producers and consumers derive from one source of truth. Generate OpenAPI, Prisma, or GraphQL types in CI and fail when the committed generated output is stale:

```bash
pnpm exec openapi-typescript ./openapi.yaml -o ./src/api/schema.gen.ts
git diff --exit-code ./src/api/schema.gen.ts
```

Generated types are compile-time declarations, not runtime validation. Every external boundary-HTTP responses, parsed JSON, environment variables, queues, and untyped library output-must validate `unknown` data at runtime with the project's schema validator. Derive the static type from that schema where possible so one definition protects both layers.

```ts
const payload: unknown = await response.json();
const user = UserSchema.parse(payload); // runtime validation at the boundary
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

Use project references to make package boundaries explicit and enable incremental, dependency-aware builds. Keep shared contracts in a dedicated package rather than importing across packages through relative paths.

```json
{
  "compilerOptions": {
    "composite": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist"
  },
  "references": [{ "path": "../shared" }, { "path": "../backend" }, { "path": "../frontend" }]
}
```

## CLI Commands

```bash
pnpm tsc                  # Type-check
pnpm tsc --noEmit         # Type-check without emitting files
pnpm tsc --build          # Build composite projects
pnpm tsc --watch          # Watch mode
```

## Automated Guardrails

Conventions that are not enforced will decay. Run `typescript-eslint` with type-aware rules appropriate to the project, including `no-explicit-any`, `no-floating-promises`, and `no-misused-promises`. Let `verbatimModuleSyntax` enforce type-only imports instead of layering a conflicting duplicate rule. Run `tsc --noEmit` on every pull request and enforce the `type-coverage` ratchet as a hard CI gate.

Prefer clear, boring types over clever nested conditional or mapped types. If a type takes several minutes to understand, simplify it or isolate it behind a named domain abstraction.

## See also

- [rule-toolchain-project](../rule-toolchain-project/SKILL.md) - Base project config
- [rule-toolchain-biome](../rule-toolchain-biome/SKILL.md) - Linting & formatting
- [rule](../rule/SKILL.md) - Central skill index
