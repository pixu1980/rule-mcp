

/**
 * @module cli/guard
 *
 * The answering side of the harness hooks. Two jobs, one entry point:
 *
 * - PreToolUse (`bash`): reads the tool payload on stdin and answers with a
 *   permission decision - ask before a migration, ask before a commit whose
 *   staged files fail guardrails.
 * - SessionStart / UserPromptSubmit (`session-start`, `prompt-submit`): decides
 *   nothing and injects the session directive as additional context.
 *
 * Kept as pure functions plus a thin IO wrapper so the whole contract is
 * testable without spawning a shell, and so the hook command needs no `jq`.
 *
 * @see module:core/agents/hooks - the hook entries that invoke this
 * @see module:core/directive - the injected text
 */

export * from "./_decide.js";
export * from "./_inject.js";
export * from "./_staged.js";
export * from "./_run.js";
