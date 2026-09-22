

/** The one-shot task prompts: flight, handon, init, update. */

/**
 * The task prompt for a name, or null when the name is not a task prompt.
 *
 * @param {string} name
 * @param {Record<string, string>} args
 * @param {(text: string) => object[]} user - message wrapper
 * @returns {object|null}
 */
export function taskPrompt(name, args, user) {
  switch (name) {
    case "rule-process-flight": {
      return {
        name,
        description: "Read the flight recorder",
        messages: user(
          [
            `Report what this server cost. Options: ${args.options ?? "export"}.`,
            "",
            "1. `rule-mcp telemetry export` writes one .flight and empties the local log; add `--redact`",
            "   for a copy that carries no prompt text and no absolute paths before sharing it.",
            "2. `telemetry show <file>` renders an existing recording; `telemetry prune` rolls up and applies",
            "   retention to both the log and exports/.",
            "3. Read the KPI block: measured savings, reminder overhead, cache hit rate, error rate, latency.",
            "4. Say what the numbers justify changing. A claim the recorder does not support is not a finding;",
            "   ask the user before acting on an ambiguous one.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope, e.g. `docs(telemetry): ...`.",
          ].join("\n"),
        ),
      };
    }

    case "rule-handon": {
      return {
        name,
        description: "Verify the last handoff against the repository now",
        messages: user(
          [
            "Call `rule_tool_process_handon` for this project (or `rule-mcp handon --dir .`).",
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
            "1. Run `rule-mcp init` - it prepares this project's directory under the state dir,",
            "   moves a local `./.rule-mcp` left by an earlier version, and runs tokensave init",
            "   unless told not to.",
            "2. For a brand-new project with no config yet (absorbed from the removed rule-setup-project),",
            "   bootstrap it first: `rule_tool_detect` to detect the stack, `rule_tool_scaffold` for the",
            "   project config files, and the toolchain area for the tooling setup before step 3.",
            "3. Confirm nothing was written into the repository: the recording lives in the state directory,",
            "   so the project needs no ignore rule and no git hook.",
            "4. Check the project's test setup exists; if there is no test surface, ask the user what to cover.",
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
