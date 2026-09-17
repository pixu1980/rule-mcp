

/** @module core/agents/commands/bodies - the router, handoff and area command bodies */

/**
 * The router command's description + body (mirrors prompts/rule.md).
 * Kept inline so the generator has no filesystem dependency.
 */
export const ROUTER = {
  description: "Explicitly route a request through rule",
  argumentHint: "<request>",
  body: [
    "Process this request through the recommended rule workflow:",
    "",
    "$ARGUMENTS",
    "",
    "Strongly recommended sequence:",
    "1. Call MCP tool `pix_tool` with the complete request and project path/framework when known.",
    "2. Load the primary routed `rule-*` skill and only the necessary secondary skills.",
    "3. Use the returned skill/tool evidence as source of truth. Never invent APIs, files, dependencies, commands, requirements, or successful checks.",
    "4. If evidence is missing, call `pix_search`; if still missing, state uncertainty instead of guessing.",
    "5. Write every comment, identifier, commit message and generated document in English, American spelling (color, behavior, organize - see rule-styleguide-english).",
    "6. Implement with failing tests first when code changes.",
    "7. Run `pix_check` against generated code. Fix every failure and rerun until all guardrails pass.",
    "8. Run project tests/typecheck. Report commands and real outcomes; never claim unexecuted checks passed.",
    "9. Finish by proposing a conventional commit message with a mandatory scope.",
    "",
    "Responses are compressed automatically by the server: keep them factual and free of filler.",
  ].join("\n"),
};

/**
 * The handoff command body (request-driven session handoff + atomic commits).
 * When the working tree is dirty, pending work is committed as a sequence of
 * scoped Conventional Commits, followed by a separate commit for pending decision
 * documents. The generated handoff is then written to docs/handoff/ and committed
 * on its own, so it survives the session instead of living only in the chat.
 * Commits stay local - the flow never pushes.
 */
export const HANDOFF_BODY = [
  "Generate a session handoff and commit pending work: $ARGUMENTS",
  "",
  "1. Run `pix_process_handoff` (default mode `handoff`, all includes on). Pass any tokens from the arguments through unchanged (e.g. `close-session`, `compress`, `brief`, `no-diff`, `no-archive`, `max=<n>`). The run archives completed audits/reviews/plans as ADRs by default and repairs the ADR numbering, so it writes to the tree; `no-archive` keeps it a read-only diagnosis.",
  "2. If the working tree has pending changes, commit them BEFORE emitting the handoff as a sequence of ATOMIC commits:",
  "   a. Group changed files by concern (one coherent change per group).",
  "   b. Stage each group explicitly (pathspecs or `git add -p`) and commit with Conventional Commits AND a mandatory scope: `type(scope): subject` (e.g. `feat(cli): ...`, `chore(eslint): ...`). The `commit-msg` hook rejects scope-less messages.",
  "   c. After the code/config commits, make ONE SEPARATE final commit for decision documents already pending in the tree (ADR, CHANGELOG, docs/): `docs(adr): ...` or `docs(handoff): ...`.",
  "   d. NEVER push. Leave every commit local for review.",
  "3. Persist the handoff: write it to `docs/handoff/<NN>-<slug>.md` where NN is the next free two-digit number in that directory and <slug> is a kebab-case topic (e.g. `13-security-audit-remediation.md`). Open with the branch, the commit range it covers, and the date. Then commit that file ALONE - no other paths - as `chore(handoff): add session handoff <NN>-<slug>`. A handoff that exists only in the chat is lost when the session ends.",
  "4. Present the handoff as a paste-ready block for the next session, including the commit-scope convention reminder, the path of the handoff file, and the list of commits just created.",
  "5. If the grouping into atomic commits is ambiguous, ask the user how to split before committing.",
  "6. Write the handoff and every commit message in English, American spelling (color, behavior, organize).",
  "7. Responses are compressed automatically by the server: keep the handoff factual and free of filler.",
].join("\n");

/**
 * Uniform body for an area/workflow command: route through rule, honor the
 * TDD/a11y baseline, validate, and close with a scoped commit.
 *
 * @param {string} description - the prompt's registry description
 * @returns {string}
 */
export function areaBody(description) {
  return [
    "Route this request through rule: $ARGUMENTS",
    "",
    `Scope: ${description}`,
    "",
    "1. Call `pix_tool` first to select the exact `rule-*` skill, then load the returned skill evidence as source of truth.",
    "2. Never invent APIs, files, dependencies, commands, or requirements not present in the evidence; if evidence is missing, call `pix_search` or state uncertainty.",
    "3. Baseline: write failing tests first (TDD) and cover a11y (WCAG 2.2 AA) where applicable; if there is no test/a11y surface, ask the user what to cover.",
    "4. Validate generated code with `pix_check`; iterate until all guardrails pass.",
    "5. Write every comment, identifier and generated document in English, American spelling (color, behavior, organize - see rule-styleguide-english).",
    "6. Finish by proposing a conventional commit message with a mandatory scope.",
    "7. Responses are compressed automatically by the server: keep it factual and free of filler.",
  ].join("\n");
}
