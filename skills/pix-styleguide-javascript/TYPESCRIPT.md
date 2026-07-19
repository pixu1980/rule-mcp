# TypeScript Rules

## Enums

- Prefer `as const` objects over TypeScript enums
- If an enum is unavoidable, use `const enum`

## Type safety patterns

- Never use `any`. Use `unknown` and narrow with type guards
- Prefer `readonly` arrays and properties where mutation is not needed
- Use `satisfies` operator for type validation without widening
- Use discriminated unions over optional properties when modeling variants
