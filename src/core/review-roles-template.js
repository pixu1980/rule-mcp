/**
 * @module core/review-roles-template
 *
 * One role becomes one prompt (personas plan A.3).
 *
 * The template is the user's own wording and is filled verbatim - the
 * placeholders are the only thing that changes. What the registry cannot say
 * is appended below it as the operation contract: which documents the run
 * produces, where they live, and how a re-run updates them.
 *
 * The output is byte-stable for a given role: every surface generates from
 * this function, so a snapshot test is enough to pin what four entry points
 * will say.
 */

/**
 * The template, exactly as written, with the operation-specific clause filled.
 * Placeholders are replaced, nothing else is invented.
 */
function templateLines(operation) {
  const action =
    operation === "audit"
      ? "and run an audit of the project to surface bugs, rework, and whatever else needs doing"
      : operation === "review"
        ? "and review the project to surface bugs, rework, and whatever else needs doing"
        : "and build a bugfix/rework plan of everything it takes to put this project in its best possible shape";

  const output =
    operation === "audit"
      ? [
          "the output of this run must be the evidence collected, without opinions,",
          "in markdown, in the ./docs/audits folder",
        ]
      : operation === "review"
        ? ["the output of this run must be the list of findings,", "in markdown, in the ./docs/reviews folder"]
        : [
            "the output of this run must be a plan with roadmaps organized into steps and dependencies,",
            "in markdown, in the ./docs/plans folder",
          ];

  return [
    "Act as a {{ROLE}} with more than {{YEARS_OF_EXPERIENCE}} years of experience,",
    "specializing in {{SKILLS}}",
    action,
    "so the run is above reproach across the very areas those skills cover.",
    "Search the web or look for recent articles to find anything else this repo could do better.",
    "",
    "If needed, switch to interview mode to untangle any open point.",
    "",
    ...output,
    "",
    `The rest of the operating contract for \`${operation}\` is below: follow it.`,
  ].join("\n");
}

/** The operations a persona run can be asked to do, in surface order. */
export const OPERATIONS = ["plan", "audit", "review"];

/**
 * The operation section of the filled template for one operation. `all` is the
 * combined contract the `rule_tool_plan` tool answers by default; the per-role
 * commands pin one operation so the user can run just that step.
 *
 * @param {object} role
 * @param {"all"|"plan"|"audit"|"review"} operation
 * @returns {string[]}
 */
function operationSection(role, operation) {
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
    "bookkeeping by hand: it writes the headers and tables, merges the findings against the last run,",
    "flips the ones you no longer report to resolved, prunes what was already resolved and deletes the",
    "plan when nothing is open. The evidence, the wording of each finding and what each step takes are",
    "yours to fill in.",
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
    ...common,
    "",
    "Audit evidence-first: measure rather than assume, and quote the command and its output for every",
    "number. Where a decision belongs to the user, stop and ask instead of guessing.",
  ];
}

/**
 * Fill the template for one role and operation.
 *
 * @param {object} role - a registry entry
 * @param {{ years?: number, skills?: string[], topic?: string, operation?: "all"|"plan"|"audit"|"review" }} [overrides]
 * @returns {string} the prompt this role's surfaces all carry
 */
export function fillRoleTemplate(role, overrides = {}) {
  if (!role) {
    throw new Error("fillRoleTemplate needs a role");
  }

  const years = overrides.years ?? role.yearsOfExperience;
  const skills = [...(role.skills ?? []), ...(overrides.skills ?? [])];
  const operation = overrides.operation ?? "all";

  const filled = templateLines(operation)
    .replace("{{ROLE}}", role.role)
    .replace("{{YEARS_OF_EXPERIENCE}}", String(years))
    .replace("{{SKILLS}}", skills.join(", "));

  const lenses = (role.lenses ?? []).map((lens) => `- ${lens}`);
  const evidence = (role.evidenceSkills ?? []).map((skill) => `- ${skill}`);

  return [
    filled,
    "",
    "## What this role looks at",
    "",
    ...(lenses.length > 0 ? lenses : ["- the whole project, through this role's expertise"]),
    ...(overrides.topic ? ["", `Focus this run on: ${overrides.topic}`] : []),
    "",
    "## Evidence to load first",
    "",
    "Load these rule skills before auditing, and treat them as source of truth:",
    "",
    ...(evidence.length > 0 ? evidence : ["- route with `rule` and use what it returns"]),
    ...operationSection(role, operation),
    "",
    "Where a decision belongs to the user, stop and ask instead of guessing.",
    "",
    "Finish by proposing a conventional commit with a mandatory scope for the documents this run wrote,",
    `for example \`docs(${role.id}): ${operation === "all" ? "audit, review and plan" : operation}\`.`,
  ].join("\n");
}
