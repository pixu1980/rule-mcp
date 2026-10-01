

/**
 * @module cli/guard
 *
 * The answering side of the harness hooks. One entry point, four jobs:
 *
 * - PreToolUse (`bash`): ask before a migration, ask before a commit whose
 *   staged files fail guardrails.
 * - PreToolUse (`structure`): ask once per task about a structural write.
 * - PostToolUse (`write`): report language and guardrails; never decide.
 * - SessionStart / UserPromptSubmit: inject the session directive, and start
 *   the task the structural gate counts in.
 *
 * Every branch but the structural one loads its own modules. That branch runs
 * before every Write/Edit/MultiEdit, so the barrel stays cheap.
 *
 * @see module:core/agents/hooks - the hook entries that invoke this
 * @see module:core/directive - the injected text
 */

export * from "./_decide.js";
export * from "./_inject.js";
export * from "./_staged.js";
export * from "./_run.js";
export { decideStructure, structuralSignal } from "./_structure.js";
export { declareStructural, startTask, clearTask } from "./_task.js";
export { neverBlocks, advise, SILENT } from "./_verdict.js";
