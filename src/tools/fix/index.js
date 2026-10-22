

/**
 * @module tools/fix
 *
 * `rule_tool_fix` - apply the deterministic guardrail fixes every skill owns.
 *
 * The guardrails split in two: the findings a machine can settle without
 * judgment (a missing blank line, a curly quote, a British spelling) and the
 * ones that need a person (an a11y gap, a schema decision). This tool does the
 * first, over the changed files or an explicit list, and leaves the second to
 * `rule_tool_check`. The passes live in `core/fix`, shared with the repo's own
 * `scripts/fix` so the tool, the script and the `/rule-fix` command cannot drift.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { z } from "zod/v4";

import { fixText } from "../../core/guardrails/fix/index.js";
import { registerTool } from "../router/index.js";

const FixSchema = z.object({
  files: z.array(z.string()).optional().describe("Files to fix, relative to the project root. Default: the changed files (working tree plus untracked)."),
  path: z.string().optional().default(".").describe("Only files under this prefix are touched (default: the whole project)"),
  mode: z.enum(["lint", "fix"]).default("lint").describe("lint: report what a fix would change. fix: write the deterministic fixes."),
  dryRun: z.boolean().optional().describe("Preview even in fix mode"),
});

/** Extensions the deterministic passes know how to touch. */
const FIXABLE = /\.(?:js|mjs|cjs|jsx|ts|tsx|mts|cts|md|mdx|markdown|txt)$/i;

/** One `git` call whose failure is an empty list, never a thrown tool. */
function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/** The changed files: the working tree diff plus everything untracked. */
function changedFiles() {
  return [...new Set([...git(["diff", "--name-only", "HEAD"]), ...git(["ls-files", "--others", "--exclude-standard"])])];
}

/**
 * The files this run touches, filtered to the ones the passes understand.
 *
 * @param {{ files?: string[], path?: string }} arguments_
 * @returns {string[]}
 */
function resolveTargets(arguments_) {
  const root = arguments_.path || ".";
  const candidates = arguments_.files?.length ? arguments_.files : changedFiles();
  const under = (file) => root === "." || file === root || file.startsWith(`${root}/`);

  return candidates.filter((file) => under(file) && FIXABLE.test(file) && existsSync(file));
}

/** Register the `rule_tool_fix` tool. */
export function registerFixTool() {
  registerTool({
    name: "rule_tool_fix",
    entry: "action",
    description: "Apply the deterministic guardrail fixes of every skill (blank lines, braces, ASCII typography, American spelling) to the changed files or an explicit list.",
    zodSchema: FixSchema,
    advertise: ["files", "path", "mode"],
    handler: async (arguments_) => {
      const write = arguments_.mode === "fix" && arguments_.dryRun !== true;
      const targets = resolveTargets(arguments_);

      if (targets.length === 0) {
        return { content: [{ type: "text", text: "No fixable files in scope: nothing changed, or none of the changed files is text the passes know." }] };
      }

      const lines = [];
      let touched = 0;

      for (const file of targets) {
        const before = readFileSync(file, "utf8");
        const { text, changed, passes } = fixText(before, { file });

        if (!changed) {
          continue;
        }

        touched++;

        if (write) {
          writeFileSync(file, text);
        }

        lines.push(`- ${file}: ${passes.join(", ")}`);
      }

      const head = `${write ? "Fixed" : "Would fix"} ${touched}/${targets.length} file(s).`;

      return {
        content: [
          {
            type: "text",
            text: [head, "", ...lines, "", "Run `rule_tool_check` for the findings that need judgment."].join("\n"),
          },
        ],
      };
    },
  });
}
