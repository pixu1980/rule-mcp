---
name: rule-styleguide-json
description: >-
  Use when structuring JSON data or API responses. Covers property naming, date formats, numeric precision, schema patterns, and consistency.
tags:
  - "json"
  - "data"
  - "api"
  - "serialization"
  - "schema"
frameworks: [all]
---

# JSON Style Guide and Standards

## Purpose

- JSON is a data interchange format, not a place for logic or comments.
- Keep JSON predictable, stable, and easy to diff in code reviews.

## Validity rules

- JSON must be valid JSON, no trailing commas.
- Use double quotes for all strings and property names.
- Allowed value types: object, array, string, number, boolean, null.
- Do not use `undefined`, functions, dates, or `NaN`/`Infinity`. Use `null` or omit the key.

## Structure and consistency

- Keep a consistent shape for the same concept across the codebase.
- Prefer stable ordering of keys inside objects to reduce diff noise.
- Use arrays for ordered collections, objects for keyed lookups.
- Avoid deeply nested structures unless required by the domain.

## Naming conventions

- Use `camelCase` for keys by default.
- Use consistent suffixes: `Id`, `At`, `Url`, `isX`, `hasX`.
- Use plural names for arrays, singular for single objects.

## Numbers, precision, and units

- Do not store ambiguous numbers. Include units via naming or structure:
  - ✅ `timeoutMs`, `sizeRem`, `angleDeg`
  - ✅ `{ "value": 350, "unit": "ms" }` when multiple units are possible
- Store currency amounts as integer minor units plus currency code:
  - ✅ `{ "amountMinor": 1299, "currency": "EUR" }`
- Avoid mixing numeric strings and numbers for the same field.

## Dates and time

- Store timestamps as ISO 8601 strings in UTC:
  - ✅ `"2026-01-19T10:15:00Z"`
- If timezone matters, include it explicitly.
- Do not store locale formatted dates.

## Booleans and nulls

- Use booleans for flags, not `"true"` or `"false"` strings.
- Use `null` only when "known empty" is meaningful.
- Prefer omitting optional fields over writing `null` everywhere.

## Schema mindset

- When a JSON file represents a contract, define a schema and follow it strictly.
- Prefer explicit versioning for long-lived formats.

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-01-19T10:15:00Z",
  "items": []
}
```

## Formatting rules

- Use 2-space indentation.
- Newline at end of file.
- One property per line.
- Keep lines reasonably short for diffs.

## Ordering guideline for object keys

When not constrained by an external spec, prefer this order:

1. identity and version: `id`, `type`, `schemaVersion`
2. metadata: `name`, `title`, `description`
3. core content fields
4. configuration and options
5. computed or derived fields
6. timestamps: `createdAt`, `updatedAt`
7. extensibility: `meta`, `extras`

## Examples

### Good

```json
{
  "id": "btn_primary",
  "name": "Primary Button",
  "isEnabled": true,
  "timeoutMs": 350,
  "createdAt": "2026-01-19T10:15:00Z",
  "tags": ["ui", "button"]
}
```

### Avoid

```json
{
  "timeout": "350",
  "enabled": "true",
  "price": 12.99
}
```

## Tooling and enforcement

- Always format JSON with a formatter on save.
- Validate JSON in CI to prevent broken files from landing in the repo.

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

---

## See also

- [rule-styleguide](../rule-styleguide/SKILL.md) - Style guides index
- [rule-mcp](../rule/SKILL.md) - Central skill index
