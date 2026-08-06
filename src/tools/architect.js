/**
 * @module tools/architect
 *
 * rule-architect specific tool logic.
 * Handles context interview server spawning for the SDD-guided
 * project scaffolding workflow.
 *
 * Lifecycle: the interview server outlives the tool call by design — the user
 * opens it in a browser after the tool responds — so every child is tracked in a
 * registry. That registry is what makes the process reusable per target
 * directory, killable on shutdown, and bounded in lifetime. Without it each call
 * left another HTTP server listening with write access to a project directory,
 * outliving the MCP server itself.
 *
 * @see module:tools/skill — registerSkillTool delegates interview mode here
 */

import { join } from "node:path";
import { spawn } from "node:child_process";
import { getSkillsDirs as getSkillsDirectories } from "../cli/paths.js";

/** Live interview servers, keyed by target directory. */
const _servers = new Map();

/** Hard ceiling on how long an unattended interview server stays up. */
const MAX_LIFETIME_MS = 30 * 60 * 1000;

/** Cap on captured child output — it is only read to find the URL. */
const MAX_OUTPUT_CHARS = 64 * 1024;

/** How long to wait for the child to announce its URL. */
const URL_TIMEOUT_MS = 5000;

/**
 * List the interview servers this process currently owns.
 *
 * @returns {Array<{ pid: number, targetDir: string, url: string|null, startedAt: number }>}
 */
export function listInterviewServers() {
  return [..._servers.values()].map(({ child, targetDir, url, startedAt }) => ({
    pid: child.pid,
    targetDir,
    url,
    startedAt,
  }));
}

/**
 * Stop every interview server this process owns.
 *
 * @returns {number} how many were killed
 */
export function stopInterviewServers() {
  let killed = 0;
  for (const entry of _servers.values()) {
    if (stopEntry(entry)) {
      killed += 1;
    }
  }
  _servers.clear();
  return killed;
}

/** Kill one entry and clear its timers. Returns whether a signal was delivered. */
function stopEntry(entry) {
  clearTimeout(entry.lifetimeTimer);
  entry.child.stdout?.removeAllListeners("data");
  entry.child.stderr?.removeAllListeners("data");
  try {
    return entry.child.kill("SIGTERM");
  } catch {
    return false;
  }
}

// A forced exit must not leave orphaned servers holding a project directory.
for (const signal of ["exit", "SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopInterviewServers();
  });
}

/**
 * Resolve the context-server script from embedded skills first, then home skills.
 *
 * @param {string} skillName
 * @returns {Promise<{ serverPath: string|null, candidates: string[] }>}
 */
async function resolveServerPath(skillName) {
  const { homeSkills, embeddedSkills } = getSkillsDirectories();
  const candidates = [
    join(embeddedSkills, skillName, "assets", "context-server.mjs"),
    join(homeSkills, skillName, "assets", "context-server.mjs"),
    // Also try .js fallback (the skill repo may have .js extension)
    join(embeddedSkills, skillName, "assets", "context-server.js"),
    join(homeSkills, skillName, "assets", "context-server.js"),
  ];

  const { accessSync, constants } = await import("node:fs");
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.F_OK);
      return { serverPath: candidate, candidates };
    } catch {
      /* next */
    }
  }
  return { serverPath: null, candidates };
}

/** Tool result for a server that is already up. */
const reusedResult = (entry) => ({
  content: [
    {
      type: "text",
      text: `## rule-architect Context Interview Server\n\nAlready running — reusing it instead of starting a second one.\n\n  **${entry.url ?? "(see terminal output)"}**\n\nTarget project: \`${entry.targetDir}/.context/\`\nPID: ${entry.child.pid}`,
    },
  ],
});

/**
 * Start the rule-architect context interview server for the given target directory.
 * The server is a Node.js HTTP server that guides the user through
 * a wizard to generate .context/ files for the SDD workflow.
 *
 * @param {string} skillName — The skill name ("rule-architect")
 * @param {string} targetDir — Project directory to generate .context/ in
 * @returns {Promise<{ content: Array<{ type: string, text: string }> }>}
 */
export async function startContextServer(skillName, targetDir) {
  const target = targetDir || process.cwd();

  // Reuse a live server for the same target: a second one would listen on
  // another port with the same write access, for no added value.
  const existing = _servers.get(target);
  if (existing && existing.child.exitCode === null && !existing.child.killed) {
    return reusedResult(existing);
  }
  _servers.delete(target);

  const { serverPath, candidates } = await resolveServerPath(skillName);
  if (!serverPath) {
    return {
      isError: true,
      content: [{ type: "text", text: "Context interview server not found. Expected at:\n" + candidates.join("\n") }],
    };
  }

  // process.execPath, not "node": PATH lookup can resolve a different runtime
  // version — or a different binary entirely.
  const child = spawn(process.execPath, [serverPath, target], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  const entry = { child, targetDir: target, url: null, startedAt: Date.now(), lifetimeTimer: null };
  entry.lifetimeTimer = setTimeout(() => {
    stopEntry(entry);
    _servers.delete(target);
  }, MAX_LIFETIME_MS);
  entry.lifetimeTimer.unref?.();
  _servers.set(target, entry);

  child.on("close", () => {
    clearTimeout(entry.lifetimeTimer);
    if (_servers.get(target) === entry) {
      _servers.delete(target);
    }
  });

  return new Promise((resolve) => {
    let output = "";
    let isResolved = false;
    let urlTimer = null;

    /** Resolve once, stop reading the child's output, keep the server running. */
    const settle = (result) => {
      if (isResolved) {
        return;
      }
      isResolved = true;
      clearTimeout(urlTimer);
      // The output was only needed to find the URL; keeping the listeners
      // attached would grow `output` for the child's whole lifetime.
      child.stdout?.removeAllListeners("data");
      child.stderr?.removeAllListeners("data");
      child.stdout?.resume();
      child.stderr?.resume();
      resolve(result);
    };

    const capture = (data) => {
      if (output.length < MAX_OUTPUT_CHARS) {
        output += data.toString();
      }
      const match = output.match(/http:\/\/localhost:\d+/);
      if (!match) {
        return;
      }
      entry.url = match[0];
      settle({
        content: [
          {
            type: "text",
            text: `## rule-architect Context Interview Server\n\nServer started! Open your browser to:\n\n  **${entry.url}**\n\nTarget project: \`${target}/.context/\`\nPID: ${child.pid} — stops automatically after 30 minutes.\n\n---\n\n${output.trim()}`,
          },
        ],
      });
    };

    child.stdout.on("data", capture);
    child.stderr.on("data", capture);

    child.on("error", (error) => {
      clearTimeout(entry.lifetimeTimer);
      _servers.delete(target);
      settle({
        isError: true,
        content: [{ type: "text", text: "Failed to start context server: " + error.message }],
      });
    });

    child.on("close", (code) => {
      settle({
        content: [
          {
            type: "text",
            text: "Context interview server stopped (exit code " + code + ").\n\nServer output:\n" + output,
          },
        ],
      });
    });

    // Timeout fallback — if the server doesn't print a URL in time, hand back
    // whatever it did print rather than hanging the tool call.
    urlTimer = setTimeout(() => {
      settle({
        content: [
          {
            type: "text",
            text:
              "## rule-architect Context Interview Server\n\nServer started. Check the terminal for the URL.\n\nOutput:\n" +
              (output || "(waiting for server...)"),
          },
        ],
      });
    }, URL_TIMEOUT_MS);
    urlTimer.unref?.();
  });
}
