# Testing Standards Rules

## Mandatory constraints

- **Vitest** is the only allowed test framework
- Never use Jest, Mocha, Jasmine, or other test frameworks
- **Exception — Expo/React Native projects**: use `jest` + `jest-expo` + `@testing-library/react-native` (React Native's native module layer is incompatible with Vitest). See `expo` rule.
- Coverage thresholds are mandatory in local config and CI

| Metric | Minimum |
|---|---|
| Statements | 60% |
| Branches | 50% |
| Functions | 60% |
| Lines | 60% |

## Required conventions

- Test files must be `*.test.ts` or `*.test.tsx`
- Tests must live under a package-level `tests/` directory
- CI must fail when `test:coverage` is below thresholds

## Implementation reference

Use `testing` skill for Vitest setup, test patterns, and practical examples.
Use `coverage-gates` skill for CI coverage enforcement details.
