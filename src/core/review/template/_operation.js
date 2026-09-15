

/** @module core/review/template/operation */

/** The operations a persona run can be asked to do, in surface order. */
export const OPERATIONS = ["plan", "audit", "review"];

/**
 * The operation section of the filled template for one operation. `all` is the
 * combined contract the `rule_tool_plan` tool answers by default; the per-role
 * commands pin one operation so the user can run just that step.
 *
 * @param {object} role
 * @param {"all"|"plan"|"audit"|"review"} operation
 * @param {string} [scope] - the binding scope of a topic-scoped run
 * @returns {string[]}
 */
export function operationSection(role, operation, scope) {
  const scoped = scope
    ? [
        "",
        `The scope of this run is binding: ${scope}. The document header states it, and every finding`,
        "cites evidence inside it. Pass `scope` to `rule_tool_plan_docs` so findings outside the scope",
        "stay untouched rather than flipped to resolved.",
      ]
    : [];
  const common = [
    "",
    `Each document opens with the run date, the role id and version (\`${role.id} v${role.version ?? 1}\`).`,
    "",
    "Write every finding, review, plan step and document in English, American spelling",
    "(color, behavior, organize). A user's prompt in another language does not change that.",
    "Run `rule_tool_check` with rule-styleguide-english (or rule-styleguide-markdown) over each written",
    "document and iterate until `allPass: true` before closing the run.",
    "",
    "Call `rule_tool_plan_docs` with this role and the findings of this run rather than writing that",
    "bookkeeping by hand: it writes the headers, tables and plan checklist, merges the findings against the",
    "flips the ones you no longer report to resolved, prunes what was already resolved and deletes the",
    "plan when nothing is open. The evidence, the wording of each finding and what each step takes are",
    "yours to fill in.",
    ...scoped,
  ];

  if (operation === "audit") {
    return [
      "## The operation: audit",
      "",
      `Produce \`docs/audits/${role.id}.md\` - evidence only: commands run with their measured values, files`,
      "read, web sources consulted. No opinions - those belong in the review. Overwritten on every run:",
      "an audit is a snapshot of now.",
      ...common,
      "",
      "Measure rather than assume, and quote the command and its output for every number.",
    ];
  }

  if (operation === "review") {
    return [
      "## The operation: review",
      "",
      `Produce \`docs/reviews/${role.id}.md\` - findings with an id, a severity, an evidence pointer into the`,
      `audit, and a status of open or resolved, distilled from \`docs/audits/${role.id}.md\`. New findings`,
      "appended, fixed ones flipped to resolved.",
      ...common,
    ];
  }

  if (operation === "plan") {
    return [
      "## The operation: plan",
      "",
      `Produce \`docs/plans/${role.id}.md\` - the roadmap, in steps with dependencies, derived from the open`,
      `findings in the review, worst first. Read \`docs/reviews/${role.id}.md\` first and derive each step from`,
      "a finding it has open; deleted by the run that finds nothing open.",
      "",
      "The plan is written by an expert with this role's years behind it, ready for development:",
      "exhaustive and meticulous, as many steps as the findings demand (no fixed count), each step",
      "split into numbered sub-steps (the `steps` array on a finding) whenever it hides more than one",
      "action - name the files, the commands and the gate that proves the step done.",
      ...common,
    ];
  }

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
    "",
    "The plan is written by an expert with this role's years behind it, ready for development:",
    "exhaustive and meticulous, as many steps as the findings demand (no fixed count), each step",
    "split into numbered sub-steps (the `steps` array on a finding) whenever it hides more than one",
    "action - name the files, the commands and the gate that proves the step done.",
    ...common,
    "",
    "Audit evidence-first: measure rather than assume, and quote the command and its output for every",
    "number. Where a decision belongs to the user, stop and ask instead of guessing.",
  ];
}
