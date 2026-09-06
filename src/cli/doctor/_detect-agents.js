/** Validate each installed agent's mcp.json entry. */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

export const HOME = homedir();

/**
 * Check agent-specific configuration details beyond basic detection.
 * Validates that the MCP server entry is well-formed.
 *
 * @param {Array} agents - Agent detection results
 * @returns {Array} - Agents with additional validation
 */
export function validateAgentConfigs(agents) {
  return agents.map((agent) => {
    if (!agent.configured || !agent.configFile) {
      return agent;
    }

    try {
      const content = readFileSync(agent.configFile, "utf8");

      // VS Code uses `servers`, not the generic `mcpServers` key.
      if (agent.name === "vscode") {
        try {
          const json = JSON.parse(content);
          const mcpEntry = json.servers?.["rule-mcp"];

          return {
            ...agent,
            validated: !!mcpEntry,
            command: mcpEntry?.command || null,
            args: mcpEntry?.args || null,
            url: mcpEntry?.url || null,
          };
        } catch {
          return { ...agent, validated: false, parseError: "Invalid JSON" };
        }
      }

      // Claude uses .claude.json with mcpServers
      if (agent.name === "claude" && agent.configFile.endsWith(".claude.json")) {
        try {
          const json = JSON.parse(content);
          const mcpEntry = json.mcpServers?.["rule-mcp"];

          return {
            ...agent,
            validated: !!mcpEntry,
            command: mcpEntry?.command || null,
            args: mcpEntry?.args || null,
          };
        } catch {
          return { ...agent, validated: false, parseError: "Invalid JSON" };
        }
      }

      // Generic JSON config check
      if (agent.configFile.endsWith("mcp.json")) {
        try {
          const json = JSON.parse(content);
          const mcpEntry = json.mcpServers?.["rule-mcp"];

          return {
            ...agent,
            validated: !!mcpEntry,
            command: mcpEntry?.command || null,
            args: mcpEntry?.args || null,
          };
        } catch {
          return { ...agent, validated: false, parseError: "Invalid JSON" };
        }
      }

      return { ...agent, validated: true };
    } catch {
      return { ...agent, validated: false, readError: "Cannot read file" };
    }
  });
}
