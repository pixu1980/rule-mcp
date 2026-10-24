

/**
 * @module prompts/task-prompts-session
 *
 * The smaller one-shot task prompts: compress, git, stats, usage.
 *
 * Split out of `_task-prompts.js` so the dispatcher stays under the file-size
 * budget (ADR 061) as the prompt set grows.
 */

/**
 * The session-side task prompt for a name, or null when it is not one.
 *
 * @param {string} name
 * @param {Record<string, string>} args
 * @param {(text: string) => object[]} user - message wrapper
 * @returns {object|null}
 */
export function sessionTaskPrompt(name, args, user) {
  switch (name) {
    case "rule-mcp-git": {
      return {
        name,
        description: "Audit and normalize the feature history",
        messages: user(
          [
            `Audit this branch's feature history and normalize it. Options: ${args.options ?? "read-only audit"}.`,
            "",
            "1. Call `rule_tool_git` action=audit, passing `force: true` when the options contain `--force`. Read the base",
            "   branch, merge base, commit range, commit count, Conventional Commit violations and merge commits.",
            "2. Take the violations from the audit; never re-derive the commit range. For each one, read the commit",
            "   (`git show <sha>`) and propose a `type(scope): subject` message.",
            "3. Show every proposal as `OLD -> NEW` and ask the user to confirm before rewriting anything.",
            "4. After confirmation, call `rule_tool_git` action=reword confirm=true with `rewrites=[{sha, message}, ...]`.",
            "   The tool refuses an invalid message or one outside the range, and refuses without confirmation.",
            "5. With merge commits present and `--force` passed, call `rule_tool_git` action=linearize force=true",
            "   confirm=true only after the user confirms. `--force` enables the proposal; it never skips the gate.",
            "6. After any rewrite, report the verification: commit count, merge commits, final tree unchanged.",
            "7. Never push. Never resolve a conflict automatically: report the files and stop.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope only if a tracked file changed.",
          ].join("\n"),
        ),
      };
    }

    case "rule-mcp-compress": {
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

    case "rule-mcp-stats": {
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

    case "rule-mcp-usage": {
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
