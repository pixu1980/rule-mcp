/**
 * @module core/review/docs
 *
 * The bookkeeping half of a review persona's run (personas C.2).
 *
 * One invocation owns three documents with stable per-role paths - the audit is
 * a snapshot and is overwritten, the review accumulates findings and flips them
 * as they close, the plan is re-derived from what is still open and disappears
 * when nothing is. Those rules are mechanical, and a rule that is mechanical and
 * still left to model discipline is a rule that holds until the run that forgets
 * it. A review whose statuses have drifted is worse than no review, because it
 * is read as current.
 *
 * So this module writes the skeletons and does the merging; the agent writes the
 * evidence, the wording of the findings and the substance of the steps. Nothing
 * here calls a model, and the same inputs always produce the same files.
 *
 * @see module:tools/plan-docs - the rule_tool_plan_docs tool over it
 * @see module:core/review/roles - where a role and its version come from
 */

export * from "./_paths.js";
export * from "./_findings.js";
export * from "./_validate.js";
export * from "./_sync.js";
