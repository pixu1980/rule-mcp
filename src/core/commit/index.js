/**
 * @module core/commit
 *
 * The Conventional Commit rule and the git gates built on it.
 *
 * One rule (`type(scope): subject`, with `!` and the `BREAKING CHANGE:` footer),
 * one linter over a message, a range or a push, and the idempotent installer
 * that gives a project the hooks to enforce it. Every consumer reads from here:
 * the `commit-msg` and `pre-push` hooks, the CLI, `/rule-git`, the handoff and
 * the CI lint.
 *
 * @see ADR 061 - one concern per file
 */

export * from "./_detect.js";
export * from "./_hook.js";
export * from "./_husky.js";
export * from "./_install.js";
export * from "./_lint.js";
export * from "./_push.js";
export * from "./_rule.js";
