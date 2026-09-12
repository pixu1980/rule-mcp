# @rule-mcp/sdk

Write a guardrail for [rule-mcp](https://github.com/pixu1980/rule-mcp).

A guardrail is one rule with one job: look at a body of code and say whether it
holds, with enough detail that a person can fix it. This package is the surface
those rules are written against, so a skill that carries its own rules carries a
declared dependency rather than a path into somebody's `src/`.

```bash
pnpm add -D @rule-mcp/sdk
```

## A rule

```js
import { countedVerdict } from "@rule-mcp/sdk";

export const noTodoComments = {
  id: "no-todo-comments",
  label: "No TODO comments",
  description: "A TODO is a decision nobody made, kept where nobody will read it. Open an issue instead.",
  check: (code) =>
    countedVerdict(
      [...code.matchAll(/\/\/\s*TODO\b.*/g)].map((match) => match[0]),
      {
        suggestion: "Do the work, or open an issue and delete the comment.",
      },
    ),
};
```

A rule is an object with `id`, `label`, `description` and `check(code, context)`.
`check` returns `{ pass, failCount, detail, suggestion }` - or just `{ pass: true, note }`
when the rule does not apply to this input. The constructors below build those
shapes so every rule reports the same way.

## Where a rule lives

Beside the skill that owns it. The skill declares what it defines, and the
folder defines it:

```
my-skill/
  SKILL.md            guardrails: [no-todo-comments]
  guardrails/
    _no-todo-comments.js
    index.js          export const GUARDRAILS = [noTodoComments];
```

Drop that folder in `./.rule-mcp/skills/` to version the rules with the
project they judge, or in `~/.rule-mcp/skills/` to carry them between
projects. The server reads both, and what a layer declares and what it exports
are checked against each other: a rule declared and not exported, or exported
and not declared, is reported by name.

## What is exported

**Verdicts** - the shapes a check returns.

| Export                                | What it does                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `countedVerdict(violations, options)` | Pass when the list is empty; otherwise fail with the first `maxDetail` entries |
| `passResult(note)`                    | The all-pass verdict, with an optional note                                    |
| `tsSkipResult(code, context)`         | The skip verdict for non-TypeScript input, or `null` when the rule should run  |
| `isTypeScriptFile(code, context)`     | Whether this input is TypeScript, by file name first and syntax second         |

**Source** - read the code a check was handed without re-parsing it.

| Export                                                 | What it does                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `maskLiterals(code)`                                   | Blank out string and template contents so a pattern cannot match inside one |
| `stripLiterals(code)`                                  | Remove literals outright                                                    |
| `extractRealCSS(code, context)`                        | The CSS in a file that may also hold markup or script                       |
| `looksLikeStylesheet(code)` / `looksLikeStyling(text)` | Whether the input is styles at all                                          |
| `unjustifiedGrids(css)`                                | `display: grid` declarations with no `/* grid: why */` beside them          |

**Manifest** - what a `package.json` says about its dependencies.

| Export                                                              | What it does                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| `manifestOf(code, context)`                                         | The parsed manifest, or `null` when this is not one         |
| `isPinned(range)`                                                   | Whether a version is exact rather than a range              |
| `INSTALLED_GROUPS`, `EXACT_VERSION`, `NOT_A_RANGE`, `MANIFEST_FILE` | The dependency groups and patterns the manifest rules share |

**Prose** - the scanners the bundled prose rules are built on.

| Export                                                                                   | What it does                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `findFingerprints(text)`                                                                 | Em dashes, typographic characters and British spellings |
| `scanCodeForForeign(code)` / `scanDocumentForForeign(text)` / `scanPathForForeign(path)` | Non-English content in comments, prose and file names   |
| `findRaggedBoxes(text)`                                                                  | ASCII boxes whose borders do not line up                |

`@rule-mcp/sdk/text` exports those subsystems whole, for a caller that
needs more than the scanners - the server's own compression pipeline rewrites
with it.

## Stability

What this package exports is contract and follows semver. What it does not
export is not available on purpose: a rule that reaches into an internal module
is a rule that breaks on a refactor it never saw.

## License

MIT
