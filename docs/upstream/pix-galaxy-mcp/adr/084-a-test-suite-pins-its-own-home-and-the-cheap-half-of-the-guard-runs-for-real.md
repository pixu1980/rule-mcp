# 084: A test suite pins its own home, and the cheap half of the guard runs for real

- **Date**: 2026-09-04
- **Status**: superseded
- **Tags**: testing, paths, telemetry, hygiene
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>
- **Superseded by**: [ADR 085](086-a-sandbox-is-a-copy-of-one-template-and-the-fixture-refuses-to-build-in-the-real.md) - the structural half is now enforced by the fixture, and the sandboxes it reads are cheap copies

## Context

projectsRoot() honors RULE_MCP_STATE_DIR on every call (ADR 082), but six suites pinned neither that variable nor HOME, so each ci run filed about twenty fixture recordings in the person's own ~/.rule-mcp/projects/. Measured there: 192 clone-_, 16 rule-init-_, 8 rule-handon-_, 8 acme-app-_ and 8 nowhere-* directories, 194 of them empty. flight-recorder deleted the state override on purpose to test the default path, which made the real home that default.

## Decision

Every suite that creates fixture projects sets process.env.HOME to a temp directory, the idiom project-dir-central already used: homedir() reads HOME, so nothing new has to be configured, and a suite that asserts the default layout still asserts it. test/home-recording-leak.test.mjs runs the two cheap suites for real (176ms together) and compares the real projects root before and after; for the four that cost 26s together it reads the pin out of the source instead. Pinning HOME for the whole test phase in package.json was rejected because it hides which suite writes where, and requiring a pin in all 45 mkdtemp suites would edit 31 files that never leaked.

## Consequences

No suite writes outside a temp home: a full ci run added zero directories to the real projects root, where it added twenty before. The guard costs 0.18s. The weaker half is structural, so one of those four suites could pin HOME and still write somewhere else without the guard noticing.

## What would end this

The four expensive suites get cheap enough to run inside the guard, or the runner pins HOME for the test phase, and the structural half stops being the best available check.
