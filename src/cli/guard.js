/**
 * @module cli/guard
 *
 * The answering side of the harness hooks. Two jobs, one entry point:
 *
 * - PreToolUse (`bash`): reads the tool payload on stdin and answers with a
 *   permission decision - ask before a migration, ask before a commit whose
 *   staged files fail guardrails.
 * - SessionStart / UserPromptSubmit (`session-start`, `prompt-submit`): decides
 *   nothing and injects the session directive as additional context.
 *
 * Kept as pure functions plus a thin IO wrapper so the whole contract is
 * testable without spawning a shell, and so the hook command needs no `jq`.
 *
 * @see module:core/agents/hooks - the hook entries that invoke this
 * @see module:core/directive - the injected text
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { isCommitCommand, isMigrationCommand } from "../core/agents/_hooks.js";
import { promptDirective, sessionDirective } from "../core/directive.js";
import { checkCode } from "../core/guardrails.js";
import { resumeContext } from "../core/resume.js";

/** Silent pass-through: the hook says nothing and the tool call proceeds. */
const ALLOW = { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" } };

/** @param {string} reason @returns {object} */
const ask = (reason) => ({
  hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: reason },
});

const MIGRATION_REASON = [
  "This applies a schema change. Once it runs, removing a column costs a second migration plus the code written on top of it.",
  "Before confirming, state for every new column: who writes it, who reads it, and which existing column already holds that value.",
  "For every new table: name the consumer. For every new index: name the query.",
  "Anything without an answer does not go in this migration (rule_tool_process_simplicity).",
].join(" ");

/** Extensions worth running guardrails on. */
const CHECKABLE = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".vue",
  ".svelte",
  ".astro",
  ".css",
  ".sql",
  ".prisma",
]);

/**
 * Map a path to the skill whose guardrails apply. Shared guardrails run for
 * every skill, so an imprecise match still checks the rules that matter here.
 *
 * @param {string} path
 * @returns {string}
 */
export function skillForPath(path) {
  const extension = extname(path);

  if (extension === ".sql" || extension === ".prisma") {
    return "rule-data-sql";
  }

  if (extension === ".vue") {
    return "rule-frontend-vue";
  }

  if (extension === ".svelte") {
    return "rule-frontend-svelte";
  }

  if (extension === ".jsx" || extension === ".tsx") {
    return "rule-frontend-react";
  }

  if (extension === ".css") {
    return "rule-styleguide-css";
  }

  return "rule-styleguide-javascript";
}

/**
 * Decide on a Bash command. Pure: the caller supplies the staged-file check so
 * this stays free of git and of the filesystem.
 *
 * @param {string} command - The command the model is about to run
 * @param {"bash"|"migration"|"commit"} [kind] - "bash" (the installed hook) checks both
 * @param {() => Array<{ file: string, failures: string[] }>} [collectFailures]
 * @returns {object} hook output
 */
export function decide(command, kind = "bash", collectFailures = () => []) {
  if (!command) {
    return ALLOW;
  }

  if (kind !== "commit" && isMigrationCommand(command)) {
    return ask(MIGRATION_REASON);
  }

  if (kind === "migration" || !isCommitCommand(command)) {
    return ALLOW;
  }

  const failures = collectFailures();

  if (failures.length === 0) {
    return ALLOW;
  }

  const summary = failures
    .slice(0, 10)
    .map(({ file, failures: ids }) => `- ${file}: ${ids.join(", ")}`)
    .join("\n");

  return ask(`rule guardrails fail on the staged files. Fix them or confirm the commit deliberately.\n${summary}`);
}

/**
 * The context-injecting hooks. No decision.
 *
 * The directive is the same whatever the user typed, but the SessionStart
 * payload carries one thing prose cannot know: whether this is a resumed
 * session. When it is, the verified handoff goes in behind the directive, so a
 * user who typed `resume` and nothing else starts where they stopped.
 *
 * @param {"session-start"|"prompt-submit"} kind
 * @param {{ source?: string, cwd?: string }} [payload] - The hook payload, when there is one
 * @returns {object} hook output
 */
export function inject(kind, payload = {}) {
  const hookEventName = kind === "session-start" ? "SessionStart" : "UserPromptSubmit";

  if (kind !== "session-start") {
    const additionalContext = promptDirective();

    return additionalContext
      ? { hookSpecificOutput: { hookEventName, additionalContext } }
      : { hookSpecificOutput: { hookEventName } };
  }
  // Directive first: it states how to work, and the handoff is what to work on.
  const additionalContext = [sessionDirective(), resumeContext(payload)].filter(Boolean).join("\n\n");

  return additionalContext
    ? { hookSpecificOutput: { hookEventName, additionalContext } }
    : { hookSpecificOutput: { hookEventName } };
}

/** @returns {string[]} staged files worth checking */
function stagedFiles() {
  try {
    // Bounded: this runs inside a PreToolUse hook, so a git that blocks - an
    // index lock held by another process, a filesystem that stops answering -
    // would hang the agent's tool call rather than this helper.
    return execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM"], {
      encoding: "utf8",
      timeout: 5000,
      killSignal: "SIGKILL",
      maxBuffer: 4 * 1024 * 1024,
    })
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && CHECKABLE.has(extname(line)));
  } catch {
    return [];
  }
}

/** @returns {Array<{ file: string, failures: string[] }>} */
export function stagedFailures() {
  const results = [];

  for (const file of stagedFiles()) {
    let code;
    try {
      code = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const report = checkCode(skillForPath(file), code, { fileName: file });

    if (!report.allPass) {
      results.push({ file, failures: report.failed.map((f) => f.id) });
    }
  }

  return results;
}

/** @param {NodeJS.ReadStream} stream @returns {Promise<string>} */
function readStdin(stream) {
  return new Promise((resolve) => {
    let data = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      data += chunk;
    });
    stream.on("end", () => resolve(data));
    stream.on("error", () => resolve(""));
  });
}

/**
 * The hook payload, or `{}` when there is none to read.
 *
 * A TTY is not a pipe: reading one waits for a keystroke that never arrives and
 * stalls the session for the whole hook timeout. Anything unparseable is also
 * `{}`, because a session that starts without its directive is worse than a
 * session that starts without its handoff.
 *
 * @param {NodeJS.ReadStream} stream
 * @returns {Promise<object>}
 */
async function readPayload(stream) {
  if (stream?.isTTY) {
    return {};
  }

  try {
    return JSON.parse(await readStdin(stream)) ?? {};
  } catch {
    return {};
  }
}

/**
 * Hook entry point. Always exits 0 and answers with JSON: a guard that crashes
 * must not become a guard that blocks every command.
 *
 * @param {"bash"|"migration"|"commit"|"session-start"|"prompt-submit"} kind
 * @param {{ stdin?: NodeJS.ReadStream, write?: (text: string) => void }} [io]
 */
export async function runGuard(kind = "bash", io = {}) {
  const { stdin = process.stdin, write = (text) => process.stdout.write(text) } = io;

  if (kind === "session-start") {
    write(JSON.stringify(inject(kind, await readPayload(stdin))));

    return;
  }

  if (kind === "prompt-submit") {
    write(JSON.stringify(inject(kind)));

    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readStdin(stdin));
  } catch {
    write(JSON.stringify(ALLOW));

    return;
  }

  const command = payload?.tool_input?.command ?? "";

  try {
    write(JSON.stringify(decide(command, kind, stagedFailures)));
  } catch {
    write(JSON.stringify(ALLOW));
  }
}
