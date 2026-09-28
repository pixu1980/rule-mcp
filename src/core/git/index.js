

/**
 * @module core/git
 *
 * The shared git foundation: one runner, one repository-state read, one
 * base-branch detection, one feature commit range and one pre-rewrite gate.
 *
 * Every later workstream reads git through this barrel instead of spawning its
 * own `git`. Git is the source of truth for branch ancestry, merge-base, commit
 * range, divergence, working-tree state and merge topology; nothing here asks a
 * model for a fact git can answer.
 *
 * @see docs/plans/mcp-git-workflow-evolution-plan.md - WS1
 */

export * from "./_base.js";
export * from "./_commits.js";
export * from "./_freshness.js";
export * from "./_range.js";
export * from "./_repo.js";
export * from "./_run.js";
export * from "./_worktree.js";
