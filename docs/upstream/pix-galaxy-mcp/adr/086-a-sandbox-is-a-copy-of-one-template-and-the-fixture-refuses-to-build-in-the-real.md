# 086: A sandbox is a copy of one template, and the fixture refuses to build in the real home

- **Date**: 2026-09-04
- **Status**: accepted
- **Tags**: testing, performance, paths, fixtures
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

ADR 083 pinned HOME in six suites and proved it by running the two cheap ones, reading the pin out of the source for the four that cost 26 seconds together. Reading a pin is weaker than observing its effect, and the reason for it was the clock: the three self-update suites built eighteen git sandboxes, eleven git invocations each, 746ms per sandbox. Separately, process-hygiene reported 25.5s for seven tests that finish in 6.2: five Promise.race calls left their losing setTimeout armed, and the event loop waited 19 seconds for the longest one.

## Decision

The sandbox is built once per process and every later one is a copy: test/fixtures/git-sandbox.mjs, 746ms to build and 39ms to copy, with origin re-pointed at the copy's own upstream so sandboxes cannot fetch from each other. The three suites that used it went 9.3s to 5.0s, 5.1s to 2.3s and 8.0s to 6.0s. That is still 13 seconds, so instead of duplicating them in the guard the fixture itself refuses to build while homedir() equals userInfo().homedir - HOME unpinned - and the error names the fix. The guard now runs three suites for real, handon among them, and asserts that the other three go through the fixture; a test of its own exercises the refusal. process-hygiene clears the timer its races lose, through one `within` helper, and asserts at the end that no timer is left armed.

## Consequences

ci went from 67.7s to 46.3s: 19s from the timers and 9s from the fixtures. The invariant moved from something each suite has to remember to something the fixture enforces, and a suite that builds a sandbox without pinning HOME now fails at the fixture with the fix in the message rather than quietly writing into the person's home. What is not covered: a suite that pins HOME and then writes somewhere else entirely, and the three legacy suites that do not use the fixture at all. The template is shared mutable state on disk - a scenario that corrupts its copy is fine, one that reaches back into the template would poison every later sandbox in that process.

## What would end this

A sandboxed suite needs a repository shape the template does not have, and copying stops being cheaper than building; or the runner starts pinning HOME for the whole test phase, at which point both halves of the guard have nothing left to prove.
