# 042: Per-prompt rules live in harness hooks, not in prose

- **Date**: 2026-08-29
- **Status**: accepted
- **Tags**: hooks, tokens, enforcement, directive
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Three rules decide whether a session is cheap or expensive: call `rule` before implementing, never spawn a subagent for work a deterministic tool answers, keep output compressed. All three were documented in prose only - in skills, in docs, in the MANDATORY block the installer writes into agent config files. Prose is read once, at the top of the session, and competes with everything that follows. By turn 50 the model has drifted: it greps instead of routing, it spawns a subagent to "explore the codebase", and it answers in full prose. An audit of the repository found the no-subagent rule appearing nowhere at all in src/, skills/ or docs/, and the token mantra nowhere either. A rule the model has to remember is not a guarantee; it is a hope. The same argument already settled the migration and commit gates (ADR 040): the enforcement point is the harness, not the paragraph.

## Decision

Add two harness hooks beside the existing PreToolUse guard. SessionStart injects the full directive once per session (rule-first, the verbatim no-subagent rule, caveman output, minimal change, the mantra). UserPromptSubmit re-anchors it on every prompt with a single line of about 18 tokens. The text lives in one module, src/core/directive.js, exporting MANTRA and NO_SUBAGENTS as constants so every other carrier - the terse workflow reminder, the generated /rule-* command bodies - reuses the exact wording instead of paraphrasing it. hookEntries() now returns entries keyed by hook event; withHooks/withoutHooks merge and remove across all three events, staying additive, idempotent and lossless for foreign hooks. Hosts without hook support (Gemini CLI, Windsurf, Cline, Devin) carry the same rules appended to every generated command file. One opt-out: RULE_MCP_NO_PROMPT_DIRECTIVE=1.

## Consequences

Full-once-then-terse keeps the cost honest: the long form is paid once per session, the per-prompt line costs about 18 tokens - far less than one avoided subagent spawn, which pays for a whole fresh context window. The directive is plain ASCII so every host renders it identically. Hooks are injection, not decision: they never block a prompt, and a malformed payload still answers with valid JSON, so a broken directive can never become a broken session. Cost: the settings merge now touches three hook containers instead of one, and uninstall must clear all three - covered by test/prompt-directive.test.mjs (36 assertions) plus the updated test/hooks-guard.test.mjs. Agents whose harness lacks SessionStart/UserPromptSubmit fall back to the command-body copy, which is weaker: it only applies when the user invokes a /rule-* command.
