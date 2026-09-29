

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

  const mode = options.closeFeature ? "close-session" : options.mode;
  const closeFeatureBlock = options.closeFeature
    ? "CLOSE-FEATURE MODE - this closes the feature, not just the session.\n" +
      "  Step 0 - Pre-close validation: call `rule_tool_git` action=audit (force=true when squashing). Read the base branch, merge base, commit range and count, Conventional Commit violations and merge commits. If the branch is behind its base, propose `rule_tool_sync` before continuing; if violations or merge commits are present, propose `/rule-git` first and stop until they are settled.\n" +
      (options.squash
        ? '  Step 0b - SQUASH: read the feature\'s commits, its overall diff (`git diff <merge-base>..HEAD`) and the ADRs recorded, then propose ONE `type(scope): subject` message that represents the whole feature, not the last session. Show the base branch, the merge base, the commit count, the commit range, the commits being squashed and the proposed message, and ask the user to confirm. Only then call `rule_tool_git` action=squash force=true confirm=true message="<the message>", and report the verification: one commit, final tree unchanged, working tree clean.\n'
        : "  Step 0b - No squash was requested: leave the feature commits as they are.\n") +
      "  Step 0c - The final message must be `type(scope): subject`: it becomes the PR title, the changelog entry and the version input.\n" +
      "  Then continue with the handoff document below.\n"
    : "";

  return {
    name,
    description: "Produce a compressed context handoff",
    messages: user(
      "You are a handoff specialist for rule-mcp.\n" +
        "The user invoked `/rule-handoff`; every option is optional and defaults are applied server-side. The requested options are already resolved here into exact tool arguments - do not reinterpret them.\n" +
        "Resolved arguments for `rule_tool_handoff` (mode: handoff | close-session):\n" +
        `- mode=${mode}\n` +
        `- compress=${options.compress ? "true" : "false"}\n` +
        `- format=${options.format}\n` +
        `- ${includeFlags}\n` +
        `- closeout=${options.closeout ? "true" : "false"} (archives completed audits/reviews/plans as ADRs and repairs the ADR numbering before rendering)\n` +
        `- maxTokens=${options.maxTokens}\n` +
        closeFeatureBlock +
        "Step 1 - Commit pending work FIRST, before running the handoff tool:\n" +
        "  a. If the working tree has uncommitted changes, group them by concern and stage each group explicitly (pathspecs or `git add -p`).\n" +
        "  b. Commit each group atomically with Conventional Commits AND a mandatory scope: `type(scope): subject` (e.g. `feat(cli): ...`, `chore(eslint): ...`). The `commit-msg` hook rejects scope-less messages - a scope is never optional.\n" +
        "  c. Make ONE SEPARATE final commit for decision documents already pending in the tree (ADR, CHANGELOG, docs/): `docs(adr): ...` or `docs(handoff): ...`.\n" +
        "  d. NEVER push. Leave every commit local for review.\n" +
        "  e. If the grouping into atomic commits is ambiguous, ask the user how to split before committing.\n" +
        "Step 2 - Run `rule_tool_handoff` with EXACTLY the resolved arguments above; do not change them.\n" +
        "Include the ADR summary (docs/adr) and git context in the output.\n" +
        "Step 3 - With closeout=true the run writes to the tree: one ADR per completed working paper, the deleted sources, and any ADR renumbering. Stage exactly those paths and commit them as ONE `docs(adr): ...` commit before going on.\n" +
        "Step 4 - Persist the handoff: write its text to `docs/handoff/<NN>-<slug>.md` where NN is the next free two-digit number and <slug> is kebab-case (e.g. `13-security-audit-remediation.md`). Open with the branch, the commit range it covers, and the date. The document ENDS with its `### Resume Prompt` section - complete the block the renderer emitted, in place, with the path of this file and the first step of the next session, and leave nothing after the closing fence. Then commit that file ALONE - no other paths - as `chore(handoff): add session handoff <NN>-<slug>`. A handoff that exists only in the chat is lost when the session ends.\n" +
        "Step 5 - Present the handoff as a paste-ready block for the next session: quote the finished `### Resume Prompt` block verbatim, then list the commits just created. The document is the source; the chat is a copy of it.\n" +
        "If the resolved arguments are ambiguous, ask the user which parts to include.\n" +
        "Finish by listing the commits just made (or proposing the next conventional commit message with a mandatory scope if nothing needed committing).",
    ),
  };
}
