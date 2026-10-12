

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
    ? "Step 5 - CLOSE-FEATURE: after the handoff and every ADR are committed, call `rule_tool_git` action=audit and read the base branch, merge base, commit range and count. Read the full feature diff (`git diff <merge-base>..HEAD`) and the commit subjects and bodies to identify a breaking change anywhere in the range. A merge commit or an invalid old subject is reported, not a reason to stop: the squash removes both. If the base moved, warn that the result may not fast-forward and propose `rule_tool_sync`, but do not silently change the boundary.\n" +
      '  Propose ONE final `type(scope): subject` message for the WHOLE feature (use `type(scope)!: subject` when breaking), not just this session. It becomes the PR title, changelog entry and version input. Call `rule_tool_git` action=squash force=true confirm=false message="<the message>" to obtain the read-only plan. Show the base branch, merge base, commit count and range, every commit being squashed, the ADR and handoff documents to consolidate, any out-of-range documents left untouched, and the proposed message; ask the user to confirm. Do not confirm on the user\'s behalf. Only after their confirmation call `rule_tool_git` action=squash force=true confirm=true message="<the message>". That commit folds the feature ADRs and handoffs into one document each (deterministic concatenation, originals deleted, both indexes rebuilt). Report the verification: one commit, only the planned document paths changed, working tree clean. No further commits after the squash.\n'
    : "Step 5 - Present the handoff as a paste-ready block for the next session: quote the finished `### Resume Prompt` block verbatim, then list the commits just created. The document is the source; the chat is a copy of it.\n";

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
        "Step 1 - Commit pending work FIRST, before running the handoff tool:\n" +
        "  a. If the working tree has uncommitted changes, group them by concern and stage each group explicitly (pathspecs or `git add -p`).\n" +
        "  b. Commit each group atomically with Conventional Commits AND a mandatory scope: `type(scope): subject` (e.g. `feat(cli): ...`, `chore(eslint): ...`). The `commit-msg` hook rejects scope-less messages - a scope is never optional.\n" +
        "  c. Make ONE SEPARATE final commit for decision documents already pending in the tree (ADR, CHANGELOG, docs/): `docs(adr): ...` or `docs(handoff): ...`.\n" +
        "  d. NEVER push. Leave every commit local for review.\n" +
        '  e. MANDATORY dependency policy: before committing, every dependency is an exact `"name": "x.y.z"` pin - never `^`, `~`, `*` or a range. Pin each ranged specifier with the project\'s package manager and `--save-exact` (e.g. `pnpm add <name>@latest --save-exact`), refresh the lockfile, and fold the manifest change into the commit group it belongs to.\n' +
        "  f. If the grouping into atomic commits is ambiguous, ask the user how to split before committing.\n" +
        "Step 2 - Run `rule_tool_handoff` with EXACTLY the resolved arguments above; do not change them.\n" +
        "Include the ADR summary (docs/adr) and git context in the output.\n" +
        "Step 3 - With closeout=true the run writes to the tree: one ADR per completed working paper, the deleted sources, and any ADR renumbering. Stage exactly those paths and commit them as ONE `docs(adr): ...` commit before going on.\n" +
        "Step 4 - Persist the handoff: write its text to `docs/handoff/<NN>-<slug>.md` where NN is the next free two-digit number and <slug> is kebab-case (e.g. `13-security-audit-remediation.md`). Open with the branch, the commit range it covers, and the date. The document ENDS with its `### Resume Prompt` section - complete the block the renderer emitted, in place, with the path of this file and the first step of the next session, and leave nothing after the closing fence. Then commit that file ALONE - no other paths - as `chore(handoff): add session handoff <NN>-<slug>`. A handoff that exists only in the chat is lost when the session ends.\n" +
        closeFeatureBlock +
        "If the resolved arguments are ambiguous, ask the user which parts to include.\n" +
        (options.closeFeature
          ? "Finish by reporting the handoff path and the final feature commit if confirmed; otherwise report the pending proposal without rewriting history."
          : "Finish by listing the commits just made (or proposing the next conventional commit message with a mandatory scope if nothing needed committing)."),
    ),
  };
}
