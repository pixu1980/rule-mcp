/** @module core/review/template/operation */

/** The operations a persona run can be asked to do, in surface order. */
export const OPERATIONS = ["plan", "audit", "review"];

/** The scope line shared by every operation, when the run was given a topic. */
function scopedLines(scope) {
  return scope
    ? [
        "",
        `The scope of this run is binding: ${scope}. The document header states it, and every finding`,
        "cites evidence inside it. Pass `scope` to `rule_tool_impersonation` so findings outside the scope",
        "stay untouched rather than flipped to resolved.",
      ]
    : [];
}

/** The bookkeeping trailer every operation shares. */
function commonLines(role, scope) {
  return [
    "",
    `Each document opens with the run date, the role id and version (\`${role.id} v${role.version ?? 1}\`).`,
    "",
    "Write every finding, review, plan step and document in English, American spelling",
    "(color, behavior, organize). A user's prompt in another language does not change that.",
    "Run `rule_tool_check` with rule-mcp-process-ai (or rule-mcp-styleguide-markdown) over each written",
    "document and iterate until `allPass: true` before closing the run.",
    "",
    "Call `rule_tool_impersonation` with this role and the findings of this run rather than writing that",
    "bookkeeping by hand: it writes the headers, tables and plan checklist, merges the findings against the",
    "flips the ones you no longer report to resolved, prunes what was already resolved and deletes the",
    "plan when nothing is open. The evidence, the wording of each finding and what each step takes are",
    "yours to fill in.",
    ...scopedLines(scope),
  ];
}

/** Audit only: the evidence snapshot every deeper operation is built on. */
function auditOperation(role) {
  return [
    "## The operation: audit",
    "",
    `Produce \`docs/audits/${role.id}.md\` - evidence only: commands run with their measured values, files`,
    "read, web sources consulted. No opinions - those belong in the review. Overwritten on every run:",
    "an audit is a snapshot of now.",
  ];
}

/** The plan paragraph, shared by the review and the deepest run. */
function planParagraph(role) {
  return [
    "",
    "The plan is written by an expert with this role's years behind it, ready for development:",
    "exhaustive and meticulous, as many steps as the findings demand (no fixed count), each step",
    "split into numbered sub-steps (the `steps` array on a finding) whenever it hides more than one",
    "action - name the files, the commands and the gate that proves the step done.",
  ];
}

/**
 * The operation section of the filled template for one operation.
 *
 * The ladder is cumulative (ADR 120). `audit` writes the evidence and stops;
 * `review` runs the audit first and derives `docs/reviews/` from it; `plan`, and
 * the default `all`, run all three. Asking for a deeper document without the
 * ones it derives from would leave the run with no evidence to stand on.
 *
 * @param {object} role
 * @param {"all"|"plan"|"audit"|"review"} operation
 * @param {string} [scope] - the binding scope of a topic-scoped run
 * @returns {string[]}
 */
export function operationSection(role, operation, scope) {
  const common = commonLines(role, scope);

  if (operation === "audit") {
    return [...auditOperation(role), ...common, "", "Measure rather than assume, and quote the command and its output for every number."];
  }

  if (operation === "review") {
    return [
      "## The operation: audit, then review",
      "",
      "One invocation produces two documents, in order:",
      "",
      `1. \`docs/audits/${role.id}.md\` - evidence only: commands run with their measured values, files read,`,
      "   web sources consulted. No opinions. Overwritten on every run: an audit is a snapshot of now.",
      `2. \`docs/reviews/${role.id}.md\` - findings with an id, a severity, an evidence pointer into the audit,`,
      "   and a status of open or resolved, distilled from the audit above. New findings appended, fixed ones",
      "   flipped to resolved.",
      ...common,
      "",
      "Audit evidence-first, then state the findings: measure rather than assume, and quote the command and",
      "its output for every number.",
    ];
  }

  // `plan` and the default `all` are the deepest run: audit, review and plan.
  return [
    "## The operation: audit, review, plan",
    "",
    "One invocation produces three documents and keeps them in sync:",
    "",
    `1. \`docs/audits/${role.id}.md\` - evidence only: commands run with their measured values, files read,`,
    "   web sources consulted. No opinions. Overwritten on every run: an audit is a snapshot of now.",
    `2. \`docs/reviews/${role.id}.md\` - findings with an id, a severity, an evidence pointer into the audit,`,
    "   and a status of open or resolved. Updated: new findings appended, fixed ones flipped to resolved.",
    `3. \`docs/plans/${role.id}.md\` - the roadmap, in steps with dependencies. Re-derived from the open`,
    "   findings; deleted when a run finds none, so the trio collapses to an audit and a review saying clean.",
    ...planParagraph(role),
    ...common,
    "",
    "Audit evidence-first: measure rather than assume, and quote the command and its output for every",
    "number. Where a decision belongs to the user, stop and ask instead of guessing.",
  ];
}
