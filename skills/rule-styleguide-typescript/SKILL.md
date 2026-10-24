---
name: rule-styleguide-typescript
description: >-
  Use when writing or reviewing TypeScript code, or configuring its compiler. Covers the anti-patterns that flag in review (any, as, enum, optional-chaining sprawl), the practices that hold up at scale (generics, never, readonly, self-documenting APIs), where types live, and the tsconfig, strict mode and path aliases.
tags:
  - typescript
  - types
  - any
  - unknown
  - generics
  - type-guard
  - enum
  - readonly
  - narrowing
  - code-review
  - styleguide
  - tsconfig
  - compiler
frameworks: [all]
guardrails: [ts-catch-unknown, ts-no-double-assertion, ts-no-explicit-any, ts-union-over-enum]
---

# rule-styleguide-typescript - Types that hold up in review

## Purpose

Compiler configuration is in [COMPILER.md](./COMPILER.md): strict mode, the base tsconfigs, path aliases, composite projects, and the runtime validation boundary.
This one is about the code: the patterns that compile, ship, work, and then make
whoever inherits them wish they had not.

Every rule here has the same shape. The type system was switched off at exactly
the point where it would have caught the bug.

## any is thirty seconds saved and thirty minutes owed

`any` does not mean "I do not know the type". It means "do not check this".

```ts
// Bad: the compiler is now decorative
const handleResponse = (data: any) => data.result.items.map((item: any) => item.name);
```

When the API renames `items`, or `result` comes back null on the error path,
nothing warns you. Write the type, or use `unknown` and narrow it:

```ts
interface ApiResponse {
  result: { items: Array<{ id: number; name: string }> };
}

const handleResponse = (data: ApiResponse) => data.result.items.map((item) => item.name);
```

`unknown` forces a check before use. `any` lets you pretend you already made it.

## catch clauses take unknown, never any

JavaScript can throw anything: a string, a number, `null`, some library object
that does not extend `Error`. A handler that assumes otherwise becomes the thing
that crashes.

```ts
try {
  await fetchData();
} catch (error: unknown) {
  if (error instanceof Error) {
    log(error.message);
  }
}
```

`strict` has included `useUnknownInCatchVariables` since TypeScript 4.4. If catch
variables are still `any` in your project, that is a message about the config.

## Type guards over as assertions

`as` says "I know better than the compiler". Usually you do not:
`response.data` is whatever the server sent, `getElementById` returns `null`
when the element is absent, `JSON.parse` returns whatever was in the string.
All three crash at runtime with no compile-time warning.

```ts
function isUser(data: unknown): data is User {
  return typeof data === "object" && data !== null && "id" in data && "name" in data;
}

if (isUser(response.data)) {
  log(response.data.name);
} // verified
if (element instanceof HTMLDivElement) {
  element.focus();
} // verified
```

Casting says "trust me". Narrowing says "here is why this is safe". `as` is fine
only where you own the value completely and a guard would be ceremony: test
fixtures, mostly. `as unknown as T` is never fine - it defeats two checks at once.

## Union types over enum

```ts
type Status = "active" | "inactive" | "pending"; // compiles to nothing

const STATUSES = ["active", "inactive", "pending"] as const;
type Status = (typeof STATUSES)[number]; // when values must be iterated
```

An `enum` emits an IIFE-wrapped object into the bundle, and a numeric enum
reverse-maps, so `Status[0]` and `Status.Active` both resolve.
`const enum` is not the escape hatch it looks like - it breaks under
`isolatedModules`, which every modern bundler sets. The guardrail fails on both
forms, so keeping one is a waiver written down in the pull request, not a
judgment call made silently.

## satisfies checks the value without widening the type

`as` and a type annotation both cost you something. The annotation widens the
value to the declared type, so the literal information is gone; `as` skips the
check that would have caught the mistake. `satisfies` does neither - it verifies
the value conforms and leaves the inferred type alone.

```ts
type Route = { path: string; auth: boolean };

const ROUTES = {
  home: { path: "/", auth: false },
  account: { path: "/me", auth: true },
} satisfies Record<string, Route>;

ROUTES.account.auth; // boolean, and `account` is a known key
Object.keys(ROUTES); // "home" | "account" survives, so this is typed
```

Annotate with `: Record<string, Route>` instead and `ROUTES.nope` compiles.
Reach for `satisfies` for config objects, route tables, theme tokens and any
literal that has to match a contract and stay narrow at the same time.

## Optional chaining: check once at the boundary

```ts
// Bad: five hops of uncertainty, and the result is `string | undefined`
const name = user?.profile?.settings?.displayName?.trim()?.toLowerCase();
```

Chained `?.` is a confession that the shape is unknown, and the type system
spreads that uncertainty to every consumer downstream. Check once where the data
arrives - API response, incoming props, parsed input - and work with certain
types inside.

```ts
function renderProfile(user: User | null) {
  if (!user) {
    return null;
  }
  return user.profile.settings.displayName.trim(); // string, not string | undefined
}
```

## interface or type: pick one rule and hold it

Neither is wrong, and that is the problem: inconsistency has no error message,
it just taxes every future reader who has to wonder whether the choice was
deliberate. The rule-mcp rule:

- `interface` for public, extensible object contracts (and declaration merging in a library).
- `type` for unions, intersections, mapped types, conditional types and simple aliases.

## Generics express a relationship, not cleverness

The point of a generic is not reuse, it is preserving a relationship between
types:

```ts
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}
```

Before writing one, answer: _what relationship am I preserving?_ If there is no
answer, write the concrete type. Same for conditional-type gymnastics - a
`DeepPartial` used twice costs more than the two interfaces it replaced, nobody
understands it in six months, and IDE tooltips expand to forty lines. A library
generic that saves a thousand consumers from hand-writing types is a different
budget from application code.

## never catches the case you forgot

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${value}`);
}

function label(status: Status): string {
  switch (status) {
    case "pending": {
      return "Pending";
    }
    case "approved": {
      return "Approved";
    }
    default: {
      return assertNever(status);
    }
  }
}
```

Adding a variant to `Status` now produces a compile error at every switch that
does not handle it. The type becomes the source of truth and the compiler finds
the call sites.

## readonly communicates ownership

```ts
type User = { readonly id: string; name: string };

function summarise(users: readonly User[]): string {
  /* ... */
}
```

The benefit is not only the blocked mutation. The signature tells every reader
that this function reads and does not own. Use it for configuration, shared
data, constants and parameters.

## Record<string, unknown> is not a type

It is the absence of one. Fine at a genuinely dynamic boundary, wrong as the
default representation: the modeled version gives autocomplete, refactoring
support, compile-time guarantees and documentation, and the broad one gives none
of those.

## Function APIs that document themselves

```ts
createUser("Ada", "ada@example.com", true, false); // what are the booleans?

createUser({ name: "Ada", email: "ada@example.com", sendWelcomeEmail: true, isAdmin: false });
```

Two positional arguments read fine. Seven are a puzzle. An options object turns
the call site into its own documentation, and adding a field stops being a
breaking change.

## Make impossible states unrepresentable

Prefer a discriminated union over independent boolean flags when a value has
mutually exclusive states. The discriminant makes illegal combinations
unrepresentable and gives switches a finite set of cases.

```ts
type RequestState<T> = { status: "idle" } | { status: "loading" } | { status: "success"; data: T } | { status: "error"; error: Error };
```

Use branded types for domain identifiers that share a runtime representation but
must never be interchangeable:

```ts
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };
type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;
```

Use `as const` for literal configuration and lookup tables, where widened
primitives would lose information worth keeping.

## Types live with their domain

A global `types.ts` starts small, collects a type per developer, and a year later
is a few hundred unrelated declarations nobody can navigate. Types belong beside
the code they describe:

```text
users/     user.types.ts  user.service.ts  user.repository.ts
payments/  payment.types.ts  payment.service.ts  payment.repository.ts
```

## Guardrails

Enforced by `rule_tool_check` on any file ending `.ts`, `.tsx`, `.mts` or `.cts`,
whichever skill is checking. String and comment contents are stripped first, so
prose never trips a rule.

| Guardrail                | Fails on                                          |
| ------------------------ | ------------------------------------------------- |
| `ts-no-explicit-any`     | `: any`, `as any`, `<any>`, `any[]`, `Array<any>` |
| `ts-catch-unknown`       | `catch (error: any)`                              |
| `ts-no-double-assertion` | `as unknown as`                                   |
| `ts-union-over-enum`     | `enum X {`, including `const enum`                |

## Conventions (rules -> skills merge)

# TypeScript Rules

## Enums

- Prefer `as const` objects over TypeScript enums
- If an enum is unavoidable, use `const enum`

## Type safety patterns

- Never use `any`. Use `unknown` and narrow with type guards
- Prefer `readonly` arrays and properties where mutation is not needed
- Use `satisfies` operator for type validation without widening
- Use discriminated unions over optional properties when modeling variants

## See also

- [COMPILER.md](./COMPILER.md) - tsconfig, strict mode, path aliases, build strategy
- [rule-styleguide-javascript](../rule-styleguide-javascript/SKILL.md) - the runtime rules underneath the types
- [rule-styleguide-naming](../rule-styleguide-naming/SKILL.md) - naming for types, files and exports
- [rule-process-code-review](../rule-process-code-review/SKILL.md) - where these get flagged
- [rule-process-ai](../rule-process-ai/SKILL.md) - the same argument against unrequested abstraction
