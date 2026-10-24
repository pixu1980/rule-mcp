/**
 * @module prompts/task-prompts
 *
 * The one-shot task prompts: handon, init, update - plus the session prompts
 * (compress, git, stats, usage) delegated to `_task-prompts-session`. Flight is
 * not a prompt (ADR 114).
 */

import { sessionTaskPrompt } from "./_task-prompts-session.js";

/**
 * The task prompt for a name, or null when the name is not a task prompt.
 *
 * @param {string} name
 * @param {Record<string, string>} args
 * @param {(text: string) => object[]} user - message wrapper
 * @returns {object|null}
 */
export function taskPrompt(name, args, user) {
  const session = sessionTaskPrompt(name, args, user);

  if (session) {
    return session;
  }

  switch (name) {
    case "rule-handon": {
      return {
        name,
        description: "Verify the last handoff against the repository now",
        messages: user(
          [
            "Call `rule_tool_handon` for this project (or `rule-mcp handon --dir .`).",
            "",
            "1. Every claim it returns carries its own verdict: act on what is still true, re-derive what changed,",
            "   and treat unverified as unknown.",
            "2. The call also sweeps completed audits/reviews/plans into ADRs and reports them under Closeout. Those",
            "   writes are uncommitted: stage them as one `docs(adr): ...` commit (pass `no-archive` to skip the sweep).",
            "3. Under `Next from the plans` it proposes the first open step of each plan that still has one.",
            "   Present that proposal and ask the user which workstream to start. Do not begin it unprompted.",
            "4. Start from the suggested first move only once the user has chosen.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope if the repo changed.",
          ].join("\n"),
        ),
      };
    }

    case "rule-init": {
      return {
        name,
        description: "Prepare a project for rule-mcp",
        messages: user(
          [
            `Initialise this project for rule-mcp. Options: ${args.options ?? "the full init"}.`,
            "",
            "1. Call `rule_tool_init` (or `rule-mcp init`) - it prepares this project's directory under the",
            "   state dir, moves a local `./.rule-mcp` left by an earlier version, and runs tokensave init",
            "   unless `no-tokensave` / noTokensave is set.",
            "2. For a brand-new project with no config yet, bootstrap via `/rule-area-styleguide` and",
            "   `/rule-area-toolchain` (name leaves like file-tree / vite in the request) plus `rule_tool_detect` before step 3.",
            "3. Report the git governance it installs or integrates: a `commit-msg` gate and a `pre-push` gate that",
            "   enforce `type(scope): subject`. Husky is installed only when a Node project has no hook mechanism;",
            "   an existing `.husky/`, `.githooks/` or `core.hooksPath` is integrated, never replaced. Recorder state",
            "   stays in the state directory, so the project needs no ignore rule for it.",
            "4. MANDATORY dependency policy: every dependency is an exact `x.y.z` pin - never `^`, `~`, `*` or a range.",
            "   `rule_tool_init` reports the ranged specifiers; pin each one with the project's package manager and",
            "   `--save-exact` (e.g. `pnpm add <name>@latest --save-exact`), refresh the lockfile, and report the",
            "   manifests that changed. `workspace:`, `file:`, `link:` and `npm:` aliases are not ranges and are left alone.",
            "5. Check the project's test setup exists; if there is no test surface, ask the user what to cover.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope, e.g. `chore(init): ...`.",
          ].join("\n"),
        ),
      };
    }

    case "rule-update": {
      return {
        name,
        description: "Apply an available server update",
        messages: user(
          [
            `Update the server. Options: ${args.options ?? "apply the update"}.`,
            "",
            "1. Updates are notify-only by default: the banner announces what is available and the merge happens",
            "   explicitly, via `rule_tool_update` or `rule-mcp update`.",
            "2. Report the commit range that was merged and whether skills or server code changed - code changes",
            "   schedule a restart.",
            "3. Run the project's tests afterwards and report the real outcome, not an assumed one.",
            "4. If the update is refused (remote not allowed, dirty tree, unsigned upstream), say which gate",
            "   refused it and ask the user before working around it.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope if anything in the repo changed.",
          ].join("\n"),
        ),
      };
    }

    default: {
      return null;
    }
  }
}
