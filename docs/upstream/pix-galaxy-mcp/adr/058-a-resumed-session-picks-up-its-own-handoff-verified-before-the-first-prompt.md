# 058: A resumed session picks up its own handoff, verified, before the first prompt

- **Date**: 2026-08-31
- **Status**: accepted
- **Tags**: hooks, handoff, session, harness, tokens
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

`pix_process_handoff` writes the snapshot and `pix_process_handon` verifies it against the repository as it is now (ADR 052). Both are typed by hand, and the session that needs them most is the one where nobody types anything: the user reopens the agent with `resume` hours or days later and asks the next question, while the file that says where the work stopped sits unread in `docs/handoff/`.

Asking the model to remember is the failure ADR 041 already ruled on: a workflow rule the model has to remember is not a gate. And the harness does know. Claude Code's `SessionStart` hook input carries `source`, one of `startup`, `resume`, `clear`, `compact` or `fork`, plus `cwd`. The hook that already injects the session directive is running at exactly the moment the answer is needed and had been ignoring its payload entirely.

## Decision

The `session-start` guard now reads its payload, and on `source: "resume"` it injects the output of `handon()` behind the session directive. `src/core/resume.js` holds the decision, `inject()` composes the two, and nothing else in the hook path changes.

Verified, never restated. The injected text is handon's report, not the handoff file, so a merged branch, a landed ADR or a commit range that moved arrives labeled changed rather than repeated as fact. A hook that pasted the handoff would hand the model a stale snapshot carrying the confidence of the original, which is the exact failure handon exists to prevent, and it would do it before the user had a chance to notice.

Resume only. `startup` is a new session, `fork` inherits the context it forked from, and `clear` is a wipe the user asked for. Injecting a handoff into any of those overrides an intention rather than serving one. No handoff means no injection at all: an apology for an absent file is tokens spent to say nothing.

Never fatal, never slow. The payload is read only when stdin is not a TTY, because reading a TTY would wait for a keystroke that never comes and stall the session for the full hook timeout. An unparseable payload, a missing directory, a directory that is not a repository and any throw inside handon all degrade to the directive alone. The block is capped at 8,000 characters with a pointer to the tool, so a pathological handoff cannot become the largest thing in the context window before the user has typed a word.

Opt out with `RULE_MCP_NO_RESUME_HANDON=1`.

## Consequences

A resumed Claude Code session starts with the handoff already verified, at the cost of one page of context on resumed sessions only and nothing on any other session. It also saves the round trip it replaces: the alternative shape, injecting an instruction to call `pix_process_handon`, spends a model turn and a tool call to arrive at the same text.

`test/session-resume.test.mjs` covers the source matrix, the empty cases, the opt-out, the composition with the directive and the CLI contract over stdin, and is wired into `pnpm run ci`.

The reach is limited by which harnesses have hooks, and only Claude Code does among the agents the installer supports. An MCP server cannot tell a resumed session from a new one: it is relaunched identically either way, and no field in `initialize` says otherwise. So for Codex, Cursor, Gemini, Pi and the rest the recovery stays manual, `pix_process_handon` or `/rule-handon` as the first move, and `docs/05-agent-instructions.md` now says so rather than implying the automation is universal. Closing that gap would mean a sentence in the server's MCP `instructions`, which every client would pay for on every session to serve the resumed ones. That is a token trade, not a bug fix, and it is left as a decision rather than taken here.

One second-order effect worth naming: this makes the quality of a handoff matter more than it did. A handoff nobody read cost nothing when it was wrong; one injected automatically at every resume is now the first thing the model sees. handon's labeling is what keeps that honest, and its rule against re-running claimed commands is what keeps it fast.

## Alternatives Considered

1. Inject an instruction to call handon rather than its output. Rejected: it spends a model turn and a tool call for the same text, and an instruction the model may skip is exactly the enforcement ADR 041 moved into the harness.
1. Paste the handoff file itself. Rejected: it is a snapshot in present tense, and three days later every sentence still reads as true. That is the defect handon was built for.
1. Fire on clear and compact too. Rejected: `clear` is a deliberate wipe and `compact` already carries a summary of the same session. Both would override an intention rather than serve one.
1. Run handon on the first tool call instead of the hook, so every agent gets it. Rejected: a server process cannot distinguish resume from startup, so it would fire on every new session, and the first tool call is not the first prompt.
1. Read the payload for `prompt-submit` as well and re-anchor the handoff. Rejected: the handoff is what to work on, stated once, not a rule that has to survive turn 50.
