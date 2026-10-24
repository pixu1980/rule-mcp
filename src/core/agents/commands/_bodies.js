/** @module core/agents/commands/bodies - the router, check and area command bodies */

import { CHECK_INTENT_KEYWORDS_LIST } from "./_check-intent.js";

/**
 * Shared guardrail-only steps once check intent is detected.
 *
 * @param {string} skillClause - how to name the skill for rule_tool_check
 * @returns {string[]}
 */
function checkModeSteps(skillClause) {
  return [
    "Check-intent path (do this instead of the normal route/implement path):",
    "1. Determine what to check:",
    "   - If $ARGUMENTS name paths/files after the intent words, use those as the target.",
    "   - Otherwise, use the current git diff (staged + unstaged) as the target.",
    "   - If no diff, check the entire project.",
    `2. Call \`rule_tool_check\` with the target and ${skillClause}.`,
    "3. Fix every guardrail failure and rerun until all pass.",
    "4. Report the commands run and real outcomes; never claim unexecuted checks passed.",
    "5. Write every comment and identifier in English, American spelling.",
    "6. Finish by proposing a conventional commit message with a mandatory scope if the tree changed.",
  ];
}

/**
 * The router command's description + body (mirrors prompts/rule.md).
 * Kept inline so the generator has no filesystem dependency.
 */
export const ROUTER = {
  description: "Explicitly route a request through rule-mcp",
  argumentHint: "<request>",
  body: [
    "Process this request through the recommended rule-mcp workflow:",
    "",
    "$ARGUMENTS",
    "",
    `Check intent: if $ARGUMENTS contain any of these whole tokens (case-insensitive) — ${CHECK_INTENT_KEYWORDS_LIST} — run the guardrail-only path below and skip the normal implement sequence.`,
    "",
    ...checkModeSteps("the auto-detected skill (from changed files, chat context, and codebase frameworks)"),
    "",
    "Otherwise (no check intent), strongly recommended sequence:",
    "1. Call MCP tool `rule_tool` with the complete request and project path/framework when known.",
    "2. Load the primary routed `rule-mcp-*` skill and only the necessary secondary skills.",
    "3. Use the returned skill/tool evidence as source of truth. Never invent APIs, files, dependencies, commands, requirements, or successful checks.",
    "4. If evidence is missing, call `rule_tool_search`; if still missing, state uncertainty instead of guessing.",
    "5. Write every comment, identifier, commit message and generated document in English, American spelling (color, behavior, organize - see rule-process-ai).",
    "6. Implement with failing tests first when code changes.",
    "7. Run `rule_tool_check` against generated code. Fix every failure and rerun until all guardrails pass.",
    "8. Run project tests/typecheck. Report commands and real outcomes; never claim unexecuted checks passed.",
    "9. Finish by proposing a conventional commit message with a mandatory scope.",
    "",
    "Responses are compressed automatically by the server: keep them factual and free of filler.",
  ].join("\n"),
};

/**
 * Uniform body for an area hub command (ADR 117: collectors only). Check intent
 * in $ARGUMENTS flips to the guardrail-only path (ADR 116).
 *
 * @param {string} description - the prompt's registry description
 * @param {{ skill?: string, members?: string[] }} [opts]
 * @returns {string}
 */
export function areaBody(description, { skill, members = [] } = {}) {
  const skillClause = skill ? `the routed leaf skill(s), defaulting to hub \`${skill}\` when the request names none` : "the routed leaf skill(s) for this area";

  const leafLines =
    members.length > 0
      ? [
          `Leaf skills/tools in this area (call those the request names; several when needed): ${members
            .map((name) => {
              const tool = `rule_tool_${name.slice("rule-mcp-".length).replaceAll("-", "_")}`;

              return `\`${name}\` / \`${tool}\``;
            })
            .join(", ")}.`,
          "",
        ]
      : [];

  return [
    "Route this request through rule-mcp: $ARGUMENTS",
    "",
    `Scope: ${description}`,
    "",
    ...leafLines,
    `Check intent: if $ARGUMENTS contain any of these whole tokens (case-insensitive) — ${CHECK_INTENT_KEYWORDS_LIST} — run the guardrail-only path and skip the normal route/implement path.`,
    "",
    ...checkModeSteps(skillClause),
    "",
    "Otherwise (no check intent):",
    "1. Parse $ARGUMENTS for every leaf topic (framework, tool, database, ...). Call `rule_tool` and/or each matching leaf `rule_tool_*`, then load that skill evidence as source of truth.",
    "2. Never invent APIs, files, dependencies, commands, or requirements not present in the evidence; if evidence is missing, call `rule_tool_search` or state uncertainty.",
    "3. Baseline: write failing tests first (TDD) and cover a11y (WCAG 2.2 AA) where applicable; if there is no test/a11y surface, ask the user what to cover.",
    "4. Validate generated code with `rule_tool_check`; iterate until all guardrails pass.",
    "5. Write every comment, identifier and generated document in English, American spelling (color, behavior, organize - see rule-process-ai).",
    "6. Finish by proposing a conventional commit message with a mandatory scope.",
    "7. Responses are compressed automatically by the server: keep it factual and free of filler.",
  ].join("\n");
}

/**
 * Body for the general `/rule-check` command (auto-detects area from context).
 * Kept as an explicit workflow; area siblings were folded into parents (ADR 116).
 */
export const generalCheckBody = [
  "Auto-detect area and run rule-mcp guardrails validation: $ARGUMENTS",
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

/**
 * Body for the general `/rule-fix` command: apply the deterministic guardrails
 * every skill owns, then hand the rest to the check. The split matters - the
 * machine settles the mechanical findings and the model spends its turns on the
 * ones that need judgment.
 */
export const generalFixBody = [
  "Apply the deterministic guardrail fixes to the changed files: $ARGUMENTS",
  "",
  "1. Determine the target:",
  "   - If $ARGUMENTS names paths/files, use those.",
  "   - Otherwise, use the current git diff (staged + unstaged).",
  "   - If no diff, fix the entire project.",
  "2. Call `rule_tool_fix` with `mode=fix` over that target. It applies the fixes a machine can settle",
  "   without judgment: blank lines, braces, single-line bodies, ASCII typography, American spelling.",
  "3. Call `rule_tool_check` on the same target for the findings that need judgment, and fix those.",
  "4. Report the files changed and the commands run; never claim an unexecuted fix.",
  "5. Write every comment and identifier in English, American spelling.",
  "6. Finish by proposing a conventional commit with a mandatory scope if the tree changed.",
  "7. Responses are compressed automatically by the server: keep it factual and free of filler.",
].join("\n");
