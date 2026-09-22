

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
 * on its own, so it survives the session instead of living only in the chat. The
 * document closes with its resume prompt, which is also the block the chat shows,
 * so the pasted block and the file cannot drift apart.
 * Commits stay local - the flow never pushes.
 */
export const HANDOFF_BODY = [
  "Generate a session handoff and commit pending work: $ARGUMENTS",
  "",
  "1. Run `rule_tool_handoff` (default mode `handoff`, all includes on). Pass any tokens from the arguments through unchanged (e.g. `close-session`, `compress`, `brief`, `no-diff`, `no-archive`, `max=<n>`). The run archives completed audits/reviews/plans as ADRs by default and repairs the ADR numbering, so it writes to the tree; `no-archive` keeps it a read-only diagnosis.",
  "2. If the working tree has pending changes, commit them BEFORE emitting the handoff as a sequence of ATOMIC commits:",
  "   a. Group changed files by concern (one coherent change per group).",
  "   b. Stage each group explicitly (pathspecs or `git add -p`) and commit with Conventional Commits AND a mandatory scope: `type(scope): subject` (e.g. `feat(cli): ...`, `chore(eslint): ...`). The `commit-msg` hook rejects scope-less messages.",
  "   c. After the code/config commits, make ONE SEPARATE final commit for decision documents already pending in the tree (ADR, CHANGELOG, docs/): `docs(adr): ...` or `docs(handoff): ...`.",
  "   d. NEVER push. Leave every commit local for review.",
  "3. Persist the handoff: write it to `docs/handoff/<NN>-<slug>.md` where NN is the next free two-digit number in that directory and <slug> is a kebab-case topic (e.g. `13-security-audit-remediation.md`). Open with the branch, the commit range it covers, and the date. The document ENDS with its `### Resume Prompt` section: complete the block the renderer emitted, in place, with the path of this file and the first step of the next session, and leave nothing after the closing fence. Then commit that file ALONE - no other paths - as `chore(handoff): add session handoff <NN>-<slug>`. A handoff that exists only in the chat is lost when the session ends.",
  "4. Present the handoff as a paste-ready block for the next session: quote the finished `### Resume Prompt` block verbatim, then list the commits just created. The document is the source; the chat is a copy of it.",
  "5. If the grouping into atomic commits is ambiguous, ask the user how to split before committing.",
  "6. Write the handoff and every commit message in English, American spelling (color, behavior, organize).",
  "7. Responses are compressed automatically by the server: keep the handoff factual and free of filler.",
].join("\n");


/**
 * The handon command body: verify the last handoff via rule_tool_handon.
 */
export const HANDON_BODY = [
  "Verify the last handoff against the repository now: $ARGUMENTS",
  "",
  "1. Call `rule_tool_handon` for this project (or `rule-mcp handon --dir .`). Pass any tokens from the arguments through unchanged (e.g. `list`, `file=<path>`, `no-archive`).",
  "2. Every claim it returns carries its own verdict: act on what is still true, re-derive what changed, and treat unverified as unknown.",
  "3. The call also sweeps completed audits/reviews/plans into ADRs and reports them under Closeout. Those writes are uncommitted: stage them as one `docs(adr): ...` commit (pass `no-archive` to skip the sweep).",
  "4. Under `Next from the plans` it proposes the first open step of each plan that still has one. Present that proposal and ask the user which workstream to start. Do not begin it unprompted.",
  "5. Finish by proposing a conventional commit with a mandatory scope if the repo changed.",
  "6. Responses are compressed automatically by the server: keep it factual and free of filler.",
].join("\n");

/** /rule-compress → rule_tool_compress (ADR 115 sole engine). */
export const COMPRESS_BODY = [
  "Compress text with rule_tool_compress: $ARGUMENTS",
  "",
  "1. Call `rule_tool_compress` with the text to transform. Mode: both | compression | fingerprint (default both).",
  "2. This is the sole compression engine: inbound prompt/context preprocessing and outbound prose postprocessing.",
  "3. Keep code fences, URLs and JSON intact. Report tokens before/after when returned.",
  "4. If no text is in the chat, ask the user what to compress before calling the tool.",
  "5. Finish by proposing a conventional commit with a mandatory scope only if a tracked file changed.",
].join("\n");

/** /rule-stats → rule_tool_stats. */
export const STATS_BODY = [
  "Read local telemetry: $ARGUMENTS",
  "",
  "1. Call `rule_tool_stats` and report calls, cache hits, tokens, latency, reminder overhead.",
  "2. Propose only changes the numbers support; ask before acting on an ambiguous reading.",
  "3. Finish by proposing a conventional commit with a mandatory scope only if docs change.",
].join("\n");

/** /rule-usage → rule_tool_usage. */
export const USAGE_BODY = [
  "Declare usage sidecar: $ARGUMENTS",
  "",
  "1. Call `rule_tool_usage` with the token/cost evidence the host did not provide as a transcript.",
  "2. Do not invent numbers; ask the user when evidence is missing.",
  "3. Finish by proposing a conventional commit with a mandatory scope only if a tracked file changed.",
].join("\n");

/** /rule-init → rule_tool_init. */
export const INIT_BODY = [
  "Prepare this project for rule-mcp: $ARGUMENTS",
  "",
  "1. Call `rule_tool_init` (or `rule-mcp init`). Pass `no-tokensave` / noTokensave when requested.",
  "2. For a brand-new project, bootstrap via `/rule-area-styleguide*` and `rule_tool_detect` before finishing.",
  "3. Confirm nothing was written into the repository: recording lives in the state directory.",
  "4. Check the project's test setup exists; if there is no test surface, ask the user what to cover.",
  "5. Finish by proposing a conventional commit with a mandatory scope, e.g. `chore(init): ...`.",
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

/**
 * Body for an area-specific check command (rule-area-*-check).
 *
 * @param {string} area - the area name (e.g., "frontend", "ui")
 * @param {string} skill - the skill name (e.g., "rule-frontend-react")
 * @returns {string}
 */
export function checkBody(area, skill) {
  return [
    `Validate code against ${area} skill guardrails: $ARGUMENTS`,
    "",
    `Target skill: ${skill}`,
    "",
    "1. Determine what to check:",
    "   - If $ARGUMENTS is provided, use those paths/files as the target.",
    "   - Otherwise, use the current git diff (staged + unstaged) as the target.",
    "   - If no diff, check the entire project.",
    "2. Call `rule_tool_check` with the target and the skill's framework/context.",
    "3. Fix every guardrail failure and rerun until all pass.",
    "4. Report the commands run and real outcomes; never claim unexecuted checks passed.",
    "5. Write every comment and identifier in English, American spelling.",
    "6. Finish by proposing a conventional commit message with a mandatory scope.",
    "7. Responses are compressed automatically by the server: keep it factual and free of filler.",
  ].join("\n");
}

/**
 * Body for the general rule-check command (auto-detects area from context).
 *
 * @returns {string}
 */
export const generalCheckBody = [
  "Auto-detect area and run rule guardrails validation: $ARGUMENTS",
  "",
  "1. Determine what to check:",
  "   - If $ARGUMENTS is provided, use those paths/files as the target.",
  "   - Otherwise, use the current git diff (staged + unstaged) as the target.",
  "   - If no diff, check the entire project.",
  "2. Auto-detect the relevant area/skill from context:",
  "   - Analyze changed files to identify the primary area (frontend, backend, ui, data, etc.)",
  "   - Consider the chat context and recent conversation for intent.",
  "   - Consider the codebase structure and frameworks in use.",
  "3. Call `rule_tool_check` with the target and the detected skill/framework.",
  "4. Fix every guardrail failure and rerun until all pass.",
  "5. Report the commands run and real outcomes; never claim unexecuted checks passed.",
  "6. Write every comment and identifier in English, American spelling.",
  "7. Finish by proposing a conventional commit message with a mandatory scope.",
  "8. Responses are compressed automatically by the server: keep it factual and free of filler.",
].join("\n");
