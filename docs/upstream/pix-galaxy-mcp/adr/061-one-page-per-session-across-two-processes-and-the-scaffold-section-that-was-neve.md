# 061: One page per session across two processes, and the scaffold section that was never written

- **Date**: 2026-08-31
- **Status**: accepted
- **Tags**: handoff, session, scaffold, guardrails, correctness
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Two defects, both named in ADR 059 and both left open there.

The first: two doors into the same handoff block. The SessionStart hook injects it in its own short-lived process; the tool path injects it from the server process. The module latch stops the tool path from repeating itself, but it cannot see what a different process already did, so a session launched with `--resume` and then handed the word `resume` got the same page twice.

The second: `pix_scaffold mode=generate` could not produce a single file. It reads templates from a `## Project Scaffolding` section of `rule-styleguide`, and that section did not exist. Every request answered `File ".nvmrc" not found. Available: .prettierrc, .nvmrc, ...` from a hardcoded string, so the error advertised files it could never produce while `mode=list` advertised them too. Adding `.npmrc` to the list made the gap larger without fixing it.

## Decision

A record in the state directory, keyed by project. The hook writes it after injecting; the tool path reads it and stays quiet when it was written after this process started.

Process start is the session identity the two paths can share. A stdio MCP server is launched once per session and lives for its duration, so "written after this process started" means "written during this session". The hook knows a `session_id` and the server never sees one, which is why the timestamp does the work instead. A record older than the process belongs to a previous session and suppresses nothing: resuming twice from the same handoff has to work twice, and keying on the handoff file would have silenced the second resume.

A record that cannot be written costs a duplicate page, never a crash, so every filesystem call around it fails open.

For the scaffold: the section now exists, at the end of `rule-styleguide`, with all eight files - `.prettierrc`, `.nvmrc`, `.npmrc`, `.editorconfig`, `.gitignore`, `eslint.config.mjs`, `tsconfig.json`, `jsconfig.json`. `extractSingleScaffoldFile` derives the available list from the headings it actually parsed instead of reciting a constant.

The templates are pinned against their own checkers rather than eyeballed: `test/scaffold-generate.test.mjs` generates every advertised file and runs it through the scaffold guardrail for that same file. A template that drifts from its rule now fails the suite, which is the property the hardcoded list had no way to have.

## Consequences

The double injection is gone in the case that produced it. What remains is the case the mechanism cannot see: a server whose process predates the session, which is HTTP or daemon mode. There the hook's record always looks newer than the process start, so the tool path stays quiet and the hook is the only door. That is the safe direction of the failure - one page, never two.

`pix_scaffold mode=generate` works for the first time. `.npmrc` required by ADR 059 is now a file the tool can hand over, not only a rule it can fail you for.

Twenty checks in `test/scaffold-generate.test.mjs`, wired into `pnpm run ci`, plus four in `test/session-resume.test.mjs` for the record: written by the hook path, read by the tool path, ignored when stale, and separate per project.

One consequence of pinning templates to guardrails: adding a scaffold file now means adding its template and its check together, or the suite says so. That is the intent.

## Alternatives Considered

1. Key the record on the handoff file and its mtime instead of on time. Rejected: resuming on Tuesday from Monday's handoff would inject nothing, which is the case the feature exists for.
1. Have the hook pass its session_id to the server. Rejected: there is no channel. The server is launched by the harness, not by the hook, and inventing one through the environment or a file is the same record with more moving parts.
1. Drop the hook path and keep only the prompt path. Rejected: `claude --resume` produces no resume prompt at all - the user resumes and types real work - so the hook covers a case the prompt cannot.
1. Keep the scaffold templates in code rather than in the skill. Rejected: the skill is the source of truth the checker and the documentation already read, and a second copy in JavaScript is a second thing to drift.
1. Delete the broken generate mode. Rejected: `mode=list` and `mode=validate` advertise the files, and the guardrails require them. A tool that names a file it will not produce is worse than no tool.
