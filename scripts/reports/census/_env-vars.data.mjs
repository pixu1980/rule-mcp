/** The environment variable registry the census documents. Data file: exempt from the size cap. */

export const ENV_VARS = [
  ["PIX_GALAXY_MCP_NO_TELEMETRY", "1 = record nothing at all (read at call time)"],
  ["PIX_GALAXY_MCP_NO_PROMPTS", "1 = record metrics, never prompt text"],
  ["PIX_GALAXY_MCP_MINIMAL_TOOLS", "1 = expose only the 10 dispatcher/action tools"],
  ["PIX_GALAXY_MCP_NO_PROMPT_DIRECTIVE", "1 = skip the injected every-prompt rules"],
  ["PIX_GALAXY_MCP_NO_RESUME_HANDON", "1 = do not verify/annotate a resume handoff"],
  ["PIX_GALAXY_MCP_AUTO_ADR", "1 = auto-record architecture decisions (default off)"],
  ["PIX_GALAXY_MCP_DISABLE_AUTO_ADR", "1 = never auto-record ADRs"],
  ["PIX_GALAXY_MCP_NO_AUTOUPDATE", "1 = disable the self-update path"],
  ["PIX_GALAXY_MCP_NO_CAVEMAN", "1 = disable caveman compression"],
  ["PIX_GALAXY_MCP_STATE_DIR", "relocate mutable state (state/data/projects/config)"],
  ["PIX_GALAXY_MCP_ROLES_DIR", "override the embedded persona catalog directory (src/roles)"],
  ["PIX_GALAXY_MCP_ROLES_OVERLAY_DIR", "override the user overlay roles directory"],
  ["PIX_GALAXY_MCP_PORT", "port for the HTTP/SSE transport"],
  ["PIX_GALAXY_MCP_HOST", "bind host for the HTTP/SSE transport"],
  ["PIX_GALAXY_MCP_UPDATE_REMOTE", "override the self-update git remote"],
];
