# Handoff 01: what is generated, and what is enforced

**Branch:** `feat/evolution` - **Range:** `d6ed101..9743827` - **Date:** 2026-09-01

Twenty-four commits. The roadmap finished except one paused phase, the quality
gates turned from declared into enforced, and every record that can be derived
now is.

## State

|                   |                                       |
| ----------------- | ------------------------------------- |
| `pnpm run ci`     | green, and it starts with lint        |
| `pnpm run lint`   | 0 errors, 0 warnings, threshold 0     |
| `pnpm run format` | passes                                |
| Routing corpus    | 82/99 exact, 99/99 top-or-alternative |
| Tool surface      | ~14,334 of 20,000                     |
| Skills            | 92, 105 tools                         |

## Read the exit code from the log, not from the task

```bash
pnpm run ci > ci.log 2>&1; echo "REAL_CI_EXIT=$?" >> ci.log
```

A backgrounded `pnpm run ci > log; echo "exit=$?"` reports the echo's status,
which is always zero. One commit in this range was reported green on a run that
had died at the lint step eleven lines in.

## What is generated, and must not be hand-edited

| File                    | Generator                                                                  |
| ----------------------- | -------------------------------------------------------------------------- |
| `docs/adr/ADR.md`       | `pix_process_adr`, byte-for-byte asserted in `test/adr-index.test.mjs` |
| `CHANGELOG.md`          | `pnpm changelog`, from the commits; the release job rebuilds it at the tag |
| `src/core/wcag-data.js` | `rule-mcp a11y-update`                                               |

All three are in `.prettierignore`. A formatter that rewrites generated output
makes the next generation a diff.

## Rules that are now mechanical rather than remembered

- **A comment says what the code does, never what it did.** `js-comment-no-history`,
  shared across every skill, with `test/comment-history.test.mjs` in CI.
- **Documentation describes the present.** `docs/` holds no history; the ADR log
  and `CHANGELOG.md` are the two exceptions and both are generated or immutable.
- **Every commit is `type(scope): subject`.** The `commit-msg` hook is installed
  in `.git/hooks/` now. A hook committed to the repository is not an installed
  hook, and this branch carried a scope-less commit until it was.

## Where the work stopped

R0 to R7 are done, each with its ADR. **R8 is paused after M1** and ADR 066 says
why: the source material the plan is sized from could not be found. Two
decisions are recorded there so nobody re-derives them, including that R8 adds
sections rather than skills when it resumes.

Still absent from the corpus: scroll-driven animation, speculation rules,
`@property`, customizable `<select>`, on-device model APIs, `:has()`, and view
transitions as a platform feature rather than as an Astro component.

## Open

- `RULE_MCP_AUTO_ADR=1` in an existing shell profile now does nothing, silently.
  A deprecation warning was offered and not taken; the decision is still open.
- The other `pix_check` false positives are unfixed: `jsdoc-required` and
  the blank-line family still fire on this repository's own source, so a clean
  guardrail run is not yet the gate that lint is.
- `stats` and `telemetry` are real CLI commands that `help` does not list.
