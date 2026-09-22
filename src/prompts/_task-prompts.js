

/** The one-shot task prompts: handon, init, update, compress, stats, usage. Flight is not a prompt (ADR 114). */

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
            "2. For a brand-new project with no config yet, bootstrap via `/rule-area-styleguide` (and",
            "   `/rule-area-styleguide-file-tree` / toolchain areas) plus `rule_tool_detect` before step 3.",
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

    case "rule-compress": {
      return {
        name,
        description: "Compress prose / preprocess prompt text via rule_tool_compress",
        messages: user(
          [
            `Compress with rule_tool_compress. Options: ${args.options ?? "both"}.`,
            "",
            "1. Call `rule_tool_compress` with the text to transform and mode both | compression | fingerprint.",
            "2. This is the sole compression engine (ADR 115): use it for inbound prompt/context preprocessing",
            "   and for outbound prose postprocessing. Do not invent a parallel compression path.",
            "3. Report tokens before/after when the tool returns them. Keep code fences, URLs and JSON intact.",
            "4. If no text is in the chat, ask the user what to compress before calling the tool.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope only if a tracked file changed.",
          ].join("\n"),
        ),
      };
    }

    case "rule-stats": {
      return {
        name,
        description: "Read local telemetry via rule_tool_stats",
        messages: user(
          [
            "Call `rule_tool_stats` and report the KPI block: calls, cache hits, tokens, latency, reminder overhead.",
            "Propose only changes the numbers support; ask before acting on an ambiguous reading.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope, e.g. `docs(telemetry): ...`, only if docs change.",
          ].join("\n"),
        ),
      };
    }

    case "rule-usage": {
      return {
        name,
        description: "Declare usage via rule_tool_usage",
        messages: user(
          [
            "Call `rule_tool_usage` with the token/cost sidecar the host did not provide as a transcript.",
            "Do not invent numbers; ask the user when evidence is missing.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope only if a tracked file changed.",
          ].join("\n"),
        ),
      };
    }

    default: {
      return null;
    }
  }
}
