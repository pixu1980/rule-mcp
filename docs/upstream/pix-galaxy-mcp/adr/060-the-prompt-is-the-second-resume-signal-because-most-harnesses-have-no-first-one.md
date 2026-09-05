# 060: The prompt is the second resume signal, because most harnesses have no first one

- **Date**: 2026-08-31
- **Status**: accepted
- **Tags**: handoff, session, cache, router, hooks
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

ADR 057 caught a resumed session through Claude Code's `SessionStart` hook and said the reach was limited to harnesses that have hooks, with the rest left manual.

That was the wrong shape of the problem. `pi resume` is not a session event at all: the harness turns the word into the user's first message, and the only components that ever see it are the model and this server. The same is true of anyone who simply types `resume` into an already-open session. Waiting for a hook that will never fire meant the feature covered one launch mode of one agent.

The server does see it, one step later, when the model routes the prompt. Which is the same moment for every practical purpose, and it needs no harness support.

## Decision

A second signal, the prompt itself. `resumeAnnouncement()` returns the same verified handoff block when the prompt is a bare resume request, and `callTool` prepends it beside the self-update banner.

Read strictly. The whole prompt, once case and punctuation are gone, has to be one of an explicit set of phrasings (`resume`, `resume work`, `where did we leave off`, `riprendi`, `continua`, and so on). A substring rule would answer "continue implementing the parser" with a handoff, and a prompt asking for real work is not a resume request however it starts.

Applied as decoration, not as a tool result. That placement is the load-bearing part: the block sits outside the deterministic core the cache stores, exactly where the update banner sits. Putting it inside `rule`'s result would have made a cached answer carry a snapshot of a repository that has since moved, which is the stale-replay failure the cache work spent a phase avoiding (ADRs 053, 056). It also keeps `rule` a pure function of its arguments, which is what makes it cacheable at all.

Once per process, latched in the module. A handoff is what to work on, stated once; a second `resume` in the same session is not a second handoff.

Same opt-out as the hook path, `RULE_MCP_NO_RESUME_HANDON=1`, since it is the same feature arriving by a different door.

`.npmrc` also moves from proposed to required, reversing the deferral in ADR 058. `pkg-exact-versions` catches a range that is already written; `save-exact=true` is what stops `pnpm add` from writing one, so scaffold mode now requires the file and `pix_scaffold` lists it. This repository has one.

## Consequences

Every MCP client is now covered, not only Claude Code: pi, codex, cursor and gemini get the handoff on the first tool call of a resumed session, provided the model routes the prompt, which the session directive already requires of it. No new install surface, no per-session token cost on sessions that are not resumed, and no sentence added to the server's MCP `instructions`, which was the alternative and would have taxed every session of every client.

Two doors into the same block means a Claude session launched with `--resume` and then handed the word `resume` could see it twice. The process latch stops the tool path from repeating, but it cannot see what the hook injected in a different process. Judged acceptable: the hook fires at session start and the prompt path fires on the first bare resume request, so the overlap needs the user to ask for a resume in a session that was already resumed.

`test/session-resume.test.mjs` covers the phrase set, the negative cases that must not fire, the latch through two real `callTool` invocations, and the block reaching the caller beside the routing payload. `test/manifest-guardrails.test.mjs` covers the `.npmrc` check, value and not just key.

One defect found while wiring the scaffold list and left alone, because it is neither caused by nor part of this change: `pix_scaffold mode=generate` cannot produce any file. It reads templates from a `## Project Scaffolding` section of `rule-styleguide` that does not exist, so every file answers "not found" against a hardcoded list of available ones. `mode=list` and `mode=validate` work. Recorded here so it is not rediscovered as a symptom of the `.npmrc` requirement.

## Alternatives Considered

1. A sentence in the server's MCP `instructions` telling the model to call handon when resuming. Rejected: every client pays for it on every session to serve the resumed ones, and it is prose the model may skip - the thing ADR 041 moved into the harness.
1. Intercept the prompt in the UserPromptSubmit hook as well. Rejected for now: it only helps Claude, which the SessionStart path already covers, and two injections in one process is the one duplication this design can actually prevent.
1. Put the block inside the `rule` tool result. Rejected: the result is cached, so a replay would hand over a stale handoff, and the tool would stop being a pure function of its arguments.
1. Match resume as a prefix or a substring. Rejected: 'continue implementing the parser' and 'resume the video playback after a seek' are work, not resume requests, and the cost of a false positive is a page of context plus a model that thinks it knows what it is doing.
1. Fire on every tool call rather than once per process. Rejected: the handoff is context, not a rule that has to survive turn 50.
