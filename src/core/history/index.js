

/**
 * @module core/history
 *
 * Auditing and normalizing the feature history behind `/rule-git`.
 *
 * The audit is read-only and reports what git sees: the base branch, the merge
 * base, the range, the Conventional Commit violations and the merge commits.
 * The rewrites are separate, confirmed steps - `reword` for the messages,
 * `linearize` for the merges - and each one verifies that the final tree is
 * unchanged, rolling the branch back when it is not.
 *
 * @see docs/plans/mcp-git-workflow-evolution-plan.md - WS4
 */

export * from "./_audit.js";
export * from "./_documents.js";
export * from "./_documents-apply.js";
export * from "./_documents-plan.js";
export * from "./_documents-refs.js";
export * from "./_linearize.js";
export * from "./_reword.js";
export * from "./_squash.js";
export * from "./_verify.js";
