---
name: rule-styleguide-comments
description: >-
  Use when writing or reviewing code comments. Covers what a comment is for, the three kinds that should never be committed - commented-out code, code kept for future use, and change history - and what to write instead.
tags:
  - comments
  - code-review
  - documentation
  - dead-code
  - history
frameworks: [all]
guardrails: [no-commented-out-code, no-future-use-code, js-comment-no-history, jsdoc-required]
---

# rule-styleguide-comments - A comment states a constraint the code cannot

Write a comment to say something the code itself cannot: a constraint, a
reason, an invariant that is not local. Never to restate what the next line
does, never to say where the code came from, never to argue that the change is
correct. That last one is the author talking to the reviewer, and it is noise
the moment the change merges.

## What never ships

- **Commented-out code.** Version control remembers it; the comment does not.
  A reader cannot tell whether it is a fix in progress, a rollback, or debris.
- **Code kept for future use.** A block held behind a comment for a feature
  nobody has asked for is a guess with a maintenance cost. Delete it and write
  it when the feature arrives.
- **Change history.** `// changed 2026-03 by ...`, `// was: foo`, or a note
  that a migration will remove the line. Git already answers who and when, and
  answers it correctly after the file moves.

## What to write instead

State the constraint and the cost of breaking it:

```js
// The pid file is removed only once the process is gone: removing it after a
// single SIGTERM would throw away the only record of a daemon that ignored
// the signal.
```

A comment like that survives a rewrite of the lines beneath it, which is the
test of whether it was worth writing.

## Documentation - JSDoc (MANDATORY)

> **Every JS/TS file MUST have complete JSDoc.** No exceptions.
> This rule is enforced by rule guardrails (`rule_tool_check` includes `jsdoc-required`).

### Rules

1. **Every exported symbol** (function, class, constant, type) MUST have a JSDoc block.
2. **Every module** MUST have a file-level JSDoc `@module` or description at the top.
3. **Every function** (exported or internal) MUST have JSDoc describing purpose, parameters, and return value.
4. **Every class** MUST have JSDoc describing its purpose and usage.
5. **Every type/interface** (TS) MUST have JSDoc.

### What a comment may contain

**Say what the code does and why it is that way now. Never say what it used to
be.** The history of a decision belongs to the ADR that took it and to git. A
copy in a comment is a second record with no generator behind it, so it goes
stale first and contradicts the one that did not.

Enforced by `js-comment-no-history`, which is shared across every skill.

| Instead of                            | Write                                                             |
| ------------------------------------- | ----------------------------------------------------------------- |
| `// This used to be two functions.`   | `// One writer, so a second without the backup cannot appear.`    |
| `// Previously this returned null.`   | `// Returns undefined when nothing is stored.`                    |
| `// The old guard accepted any root.` | `// Accepting any root makes the traversal check unable to fail.` |
| `// We changed this to a Map.`        | `// A Map, because the key is looked up per request.`             |

Verbosity is minimal by default. That means:

- **JSDoc on every exported symbol, every function, every class, every type.**
  This is not the part to trim, and `jsdoc-required` blocks a file that skips it.
- **A comment where the logic is genuinely hard**, explaining what it does and
  what would go wrong otherwise. A non-obvious invariant, an ordering that
  matters, a bound that has a reason.
- **Nothing else.** A comment restating the line below it is noise, and a
  comment narrating a change is duplication.

### JSDoc Format

```js
/**
 * Brief description of what this does. Start with a verb.
 * Use a second paragraph for additional context if needed.
 *
 * @param {Type} paramName - Description of param
 * @param {Type} [optionalParam] - Description with default
 * @returns {Type} - Description of return value
 */
export function myFunction(paramName, optionalParam = "default") {
  // ...
}
```

### Module-level JSDoc

```js
/**
 * @module path/to/module
 *
 * Brief description of the module's purpose.
 * What it provides, how it fits in the architecture.
 */
```

### Component JSDoc (React / Solid / etc.)

```js
/**
 * TodoItem component.
 *
 * Renders a single todo item with toggle and delete controls.
 * Follows rule principles: zero CSS classes, semantic HTML.
 *
 * @param {{ todo: Todo, onToggle: (id: string) => void, onDelete: (id: string) => void }} props
 * @returns {JSX.Element}
 */
export function TodoItem({ todo, onToggle, onDelete }) {
  // ...
}
```

### Class JSDoc (Custom Elements)

```js
/**
 * @element todo-item
 *
 * Custom element for rendering a todo item.
 * Uses adoptedStyleSheets for styling, data-part selectors for children.
 *
 * @attr {boolean} completed - Whether the todo is done
 * @attr {string} todo-id - Unique identifier
 * @fires toggle - When checkbox changes
 */
export class TodoItem extends HTMLElement {
  // ...
}
```

### Internal (non-exported) functions

Even private/helper functions MUST have JSDoc. One line is acceptable for obvious ones:

```js
/** Returns a formatted date string for display. */
function formatDate(date) { ... }
```

### Enforcement

- The `rule_tool_check` tool validates JSDoc presence on all exported symbols.
- Run `rule_tool_<skill> mode=check` on your code to verify documentation compliance.
- **CI MUST fail** if any JS/TS file lacks required JSDoc.

### Documenting CSS

For CSS file documentation rules, see [`css.md`][rule-styleguide-css](../rule-styleguide-css/SKILL.md) -> Documentation section.

## See also

- `rule-styleguide` - the styleguide hub these rules belong to
- `rule-styleguide-naming` - what a file is called, before what is inside it
- `rule-process-code-review` - where these rules are applied to someone else's change
