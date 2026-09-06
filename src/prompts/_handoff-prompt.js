/** The /rule-handoff workflow prompt: resolve options server-side, then commit, run, persist. */
import { parseHandoffOptions } from "./_handoff-options.js";

/**
 * The rule-handoff prompt, with the options already resolved to exact tool arguments.
 *
 * @param {Record<string, string>} args
 * @param {(text: string) => object[]} user - message wrapper
 * @returns {object}
 */
export function handoffPrompt(args, user) {
  const name = "rule-handoff";
  const options = parseHandoffOptions(args?.options);

  const includeFlags = [
    `${options.includeGitDiff ? "includeGitDiff=yes" : "includeGitDiff=no"}`,
    `${options.includeGitLog ? "includeGitLog=yes" : "includeGitLog=no"}`,
    `${options.includeContext ? "includeContext=yes" : "includeContext=no"}`,
    `${options.includeAdrs ? "includeAdrs=yes" : "includeAdrs=no"}`,
    `${options.includeRoadmap ? "includeRoadmap=yes" : "includeRoadmap=no"}`,
  ].join(", ");

  return {
    name,
    description: "Produce a compressed context handoff",
    messages: user(
      "You are a handoff specialist for rule-mcp.\n" +
        "The user invoked `/rule-handoff`; every option is optional and defaults are applied server-side. The requested options are already resolved here into exact tool arguments - do not reinterpret them.\n" +
        "Resolved arguments for `rule_tool_process_handoff` (mode: handoff | close-session):\n" +
        `- mode=${options.mode}\n` +
        `- compress=${options.compress ? "true" : "false"}\n` +
        `- format=${options.format}\n` +
        `- ${includeFlags}\n` +
        `- maxTokens=${options.maxTokens}\n` +
        "Step 1 - Commit pending work FIRST, before running the handoff tool:\n" +
        "  a. If the working tree has uncommitted changes, group them by concern and stage each group explicitly (pathspecs or `git add -p`).\n" +
        "  b. Commit each group atomically with Conventional Commits AND a mandatory scope: `type(scope): subject` (e.g. `feat(cli): ...`, `chore(eslint): ...`). The `commit-msg` hook rejects scope-less messages - a scope is never optional.\n" +
        "  c. Make ONE SEPARATE final commit for decision documents already pending in the tree (ADR, CHANGELOG, docs/): `docs(adr): ...` or `docs(handoff): ...`.\n" +
        "  d. NEVER push. Leave every commit local for review.\n" +
        "  e. If the grouping into atomic commits is ambiguous, ask the user how to split before committing.\n" +
        "Step 2 - Run `rule_tool_process_handoff` with EXACTLY the resolved arguments above; do not change them.\n" +
        "Include the ADR summary (docs/adr) and git context in the output.\n" +
        "Step 3 - Persist the handoff: write its text to `docs/handoff/<NN>-<slug>.md` where NN is the next free two-digit number and <slug> is kebab-case (e.g. `13-security-audit-remediation.md`). Open with the branch, the commit range it covers, and the date. Then commit that file ALONE - no other paths - as `chore(handoff): add session handoff <NN>-<slug>`. A handoff that exists only in the chat is lost when the session ends.\n" +
        "Step 4 - Present the handoff as a paste-ready block for the next session, including the commit-scope convention reminder, the path of the handoff file, and the list of commits just created.\n" +
        "If the resolved arguments are ambiguous, ask the user which parts to include.\n" +
        "Finish by listing the commits just made (or proposing the next conventional commit message with a mandatory scope if nothing needed committing).",
    ),
  };
}
