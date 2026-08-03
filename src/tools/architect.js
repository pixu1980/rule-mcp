/**
 * @module tools/architect
 *
 * rule-architect specific tool logic.
 * Handles context interview server spawning for the SDD-guided
 * project scaffolding workflow.
 *
 * @see module:tools/skill — registerSkillTool delegates interview mode here
 */

import { join } from "node:path";
import { spawn } from "node:child_process";
import { getSkillsDirs as getSkillsDirectories } from "../cli/paths.js";

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
  // Resolve the server script path from embedded skills first, then home skills
  const { homeSkills, embeddedSkills } = getSkillsDirectories();
  const serverPaths = [
    join(embeddedSkills, skillName, "assets", "context-server.mjs"),
    join(homeSkills, skillName, "assets", "context-server.mjs"),
    // Also try .js fallback (the skill repo may have .js extension)
    join(embeddedSkills, skillName, "assets", "context-server.js"),
    join(homeSkills, skillName, "assets", "context-server.js"),
  ];

  let serverPath = null;
  for (const p of serverPaths) {
    try {
      const { accessSync, constants } = await import("node:fs");
      accessSync(p, constants.F_OK);
      serverPath = p;
      break;
    } catch { /* next */ }
  }

  if (!serverPath) {
    return {
      isError: true,
      content: [{ type: "text", text: "Context interview server not found. Expected at:\n" + serverPaths.join("\n") }],
    };
  }

  // Spawn the server as a child process
  return new Promise((resolve) => {
    const proc = spawn("node", [serverPath, targetDir || process.cwd()], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    let output = "";
    let isResolved = false;

    proc.stdout.on("data", (data) => {
      output += data.toString();
      // Try to extract URL from output
      if (!isResolved && output.includes("http://localhost")) {
        isResolved = true;
        const urlMatch = output.match(/http:\/\/localhost:\d+/);
        const url = urlMatch ? urlMatch[0] : "(see output)";
        resolve({
          content: [{
            type: "text",
            text: `## rule-architect Context Interview Server\n\nServer started! Open your browser to:\n\n  **${url}**\n\nTarget project: \`${targetDir || process.cwd()}/.context/\`\n\nPress Ctrl+C to stop the server when done.\n\n---\n\n${output.trim()}`,
          }],
        });
      }
    });

    proc.stderr.on("data", (data) => {
      output += data.toString();
    });

    proc.on("error", (error) => {
      if (isResolved) {
      	return;
      }

      isResolved = true;
      resolve({
        isError: true,
        content: [{ type: "text", text: "Failed to start context server: " + error.message }],
      });
    });

    proc.on("close", (code) => {
      if (isResolved) {
      	return;
      }

      isResolved = true;
      resolve({
        content: [{ type: "text", text: "Context interview server stopped (exit code " + code + ").\n\nServer output:\n" + output }],
      });
    });

    // Timeout fallback — if server doesn't print URL within 5s, send output anyway
    setTimeout(() => {
      if (isResolved) {
      	return;
      }

      isResolved = true;
      resolve({
        content: [{ type: "text", text: "## rule-architect Context Interview Server\n\nServer started. Check the terminal for the URL.\n\nOutput:\n" + (output || "(waiting for server...)") }],
      });
    }, 5000);
  });
}
