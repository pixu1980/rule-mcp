# Engineering guides

This chapter tells how to work on this repository. Read `CONTRIBUTING.md` for the pull request gates, `GOVERNANCE.md` for who decides, and `SECURITY.md` for the disclosure path.

## The work loop

1. Write a failing test. To run one file, use `node --import ./scripts/alias-hook.mjs --test <file>`.
2. Change the code until the test passes.
3. Run the full suite with `pnpm run ci`.
4. Run `pnpm lint`.
5. Run `pnpm format:fix`.
6. Commit with `type(scope): subject`. The `commit-msg` hook refuses a subject with no scope.

## Commands

| Command                   | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `pnpm run ci`             | All tests, the same suite as the CI gate            |
| `pnpm test:coverage`      | All tests with the branch coverage floor            |
| `pnpm lint`               | ESLint on `bin/`, `packages/`, and the script tests |
| `pnpm format`             | Prettier check                                      |
| `pnpm census`             | Writes the generated documents                      |
| `pnpm census:check`       | Fails if a generated document is not current        |
| `pnpm docs:dev`           | Serves the documentation site on your machine       |
| `pnpm docs:build`         | Builds the site into `site-dist/`                   |
| `pnpm test:e2e:docs-site` | Runs the Playwright tests of the site               |
| `pnpm release`            | Publishes a version, see [Release](./08-release.md) |

## CI

| Workflow        | Trigger                       | Jobs                                                                       |
| --------------- | ----------------------------- | -------------------------------------------------------------------------- |
| `ci.yml`        | Push, pull request            | Lint, secrets, tests on three systems, coverage, commits, audit, workflows |
| `pages.yml`     | After `ci` succeeds on `main` | Builds the site with pnpm and publishes it to GitHub Pages                 |
| `release.yml`   | Tag `v*`                      | Builds, verifies, and publishes the GitHub Release                         |
| `scorecard.yml` | Schedule, push                | OpenSSF Scorecard                                                          |

CI uses Node.js 24 and 26, and pnpm 11.25.0. A newer push cancels the run it
supersedes, and the site publishes only after the run that covers its tree
passes.

## Guardrails

A guardrail is a deterministic check on code. Each skill owns its rules in `skills/<skill>/guardrails/`. Shared rules are in `packages/mcp/core/guardrails/`. Project-level checks are in `packages/mcp/core/guardrails/project/`.

`rule_tool_check` runs the rules of one skill on a file or a snippet. `mode: "project"` adds the graph checks. `rule_tool_fix` applies the deterministic fixes: blank lines, braces, ASCII punctuation, and American spelling.

`packages/mcp/core/guardrails/__tests__/_self-guardrails.test.mjs` runs the guardrails on this repository.

## Documentation

There are two kinds of page, and each kind has one owner.

- **Generated pages** are chapters 13 to 23. `pnpm census` writes the full file from the code. Edit the generator in `scripts/reports/census/`, not the page.
- **Written pages** are `README.md`, `docs/README.md`, and chapters 1 to 12.

The pre-commit hook runs the census and stages the result. CI runs `pnpm census:check`. The post-commit hook keeps the changelog current, see [Release](./08-release.md).

Follow these rules in each page:

- Use simple English. Follow ASD-STE100: short sentences, active voice, one idea in each sentence.
- Do not put HTML in Markdown. `scripts/__tests__/docs/no-raw-html.test.mjs` fails on it. A placeholder such as `<slug>` goes in a code span.
- Use only numbers that a test can compute. `scripts/__tests__/docs/docs-accuracy.test.mjs` compares `README.md` and `CLAUDE.md` with the live server.

The site adds its structure in `packages/docs/_decorate.mjs`. It reads the shape of the Markdown, so the Markdown stays plain.

## Deep topics

- **Compression.** `packages/mcp/core/text/` shortens what the server sends to a model.
- **TokenSave adapter.** `packages/mcp/core/tokensave/` reads the code graph when it is installed.
- **ADRs.** `docs/adr/` records each structural decision. To reverse a decision, write a new ADR that supersedes the old one.
