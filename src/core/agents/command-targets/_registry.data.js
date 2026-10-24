

/** @module core/agents/command-targets/registry - every directory and render format, per agent */

import { join } from "node:path";
import { editorDataRoot, vscodePromptDirs, firstExisting, ifParentExists } from "./_context.js";

/**
 * The registry. One entry per (agent, scope) pair:
 *   - `agent`               install-registry agent name
 *   - `label`               human label used in installer/uninstaller output
 *   - `format`              render format (see module:core/agents/commands FORMATS)
 *   - `scope`               "global" (user-level) or "project" (cwd)
 *   - `namespacedPrompts`   the host prefixes MCP prompts, so suppress them
 *   - `detect(ctx)`         is the agent present on this machine?
 *   - `dirs(ctx)`           resolved directories to write into
 */
export const COMMAND_TARGETS = [
  {
    agent: "claude",
    label: "Claude Code",
    format: "args",
    scope: "global",
    namespacedPrompts: true,
    detect: (ctx) => ctx.exists(join(ctx.home, ".claude")),
    dirs: (ctx) => [join(ctx.home, ".claude", "commands")],
  },
  {
    agent: "vscode",
    label: "VS Code (Copilot Chat)",
    format: "prompt",
    scope: "global",
    namespacedPrompts: true,
    detect: (ctx) => ctx.exists(join(editorDataRoot(ctx), "Code", "User")),
    dirs: vscodePromptDirs,
  },
  // NOTE: VS Code also reads workspace prompt files from `.github/prompts`, but
  // that is a committed, team-shared location - 24 generated files would land in
  // the user's git status on every install. User-level prompt files already apply
  // to every workspace, so the workspace dir is left to explicit
  // `agent-commands --dir .github/prompts --format prompt`.
  {
    agent: "pi",
    label: "Pi",
    format: "args",
    scope: "global",
    // Pi is configured with toolPrefix "none", so its MCP prompts are already
    // bare `/rule-mcp-*` - keep them and add the files.
    namespacedPrompts: false,
    detect: (ctx) => ctx.exists(ctx.env.PI_CODING_AGENT_DIR || join(ctx.home, ".pi", "agent")),
    dirs: (ctx) => [join(ctx.env.PI_CODING_AGENT_DIR || join(ctx.home, ".pi", "agent"), "prompts")],
  },
  {
    agent: "gemini",
    label: "Gemini CLI",
    format: "gemini",
    scope: "global",
    namespacedPrompts: false,
    detect: (ctx) => ctx.exists(join(ctx.home, ".gemini")),
    dirs: (ctx) => [join(ctx.home, ".gemini", "commands")],
  },
  {
    agent: "cursor",
    label: "Cursor project",
    format: "args",
    scope: "project",
    namespacedPrompts: false,
    detect: (ctx) => ctx.exists(join(ctx.cwd, ".cursor")),
    dirs: (ctx) => [join(ctx.cwd, ".cursor", "commands")],
  },
  {
    agent: "windsurf",
    label: "Windsurf",
    format: "workflow",
    scope: "global",
    namespacedPrompts: false,
    detect: (ctx) => ctx.exists(join(ctx.home, ".codeium", "windsurf")) || ctx.exists(join(ctx.home, ".config", "windsurf")),
    dirs: (ctx) =>
      firstExisting(ctx, [
        {
          gate: join(ctx.home, ".codeium", "windsurf"),
          dir: join(ctx.home, ".codeium", "windsurf", "global_workflows"),
        },
        { gate: join(ctx.home, ".config", "windsurf"), dir: join(ctx.home, ".config", "windsurf", "global_workflows") },
      ]),
  },
  {
    agent: "windsurf",
    label: "Windsurf project",
    format: "workflow",
    scope: "project",
    namespacedPrompts: false,
    detect: (ctx) => ctx.exists(join(ctx.cwd, ".windsurf")),
    dirs: (ctx) => ifParentExists(ctx, join(ctx.cwd, ".windsurf"), join(ctx.cwd, ".windsurf", "workflows")),
  },
  {
    agent: "cline",
    label: "Cline",
    format: "workflow",
    scope: "global",
    namespacedPrompts: false,
    detect: (ctx) => ctx.exists(join(ctx.home, ".cline")) || ctx.exists(join(ctx.home, ".config", "cline")),
    dirs: (ctx) =>
      firstExisting(ctx, [
        { gate: join(ctx.home, ".cline"), dir: join(ctx.home, ".cline", "data", "workflows") },
        { gate: join(ctx.home, ".config", "cline"), dir: join(ctx.home, ".config", "cline", "data", "workflows") },
      ]),
  },
  {
    agent: "cline",
    label: "Cline project",
    format: "workflow",
    scope: "project",
    namespacedPrompts: false,
    detect: (ctx) => ctx.exists(join(ctx.cwd, ".clinerules")),
    dirs: (ctx) => ifParentExists(ctx, join(ctx.cwd, ".clinerules"), join(ctx.cwd, ".clinerules", "workflows")),
  },
  {
    agent: "roo",
    label: "Roo Code",
    format: "plain",
    scope: "global",
    namespacedPrompts: false,
    detect: (ctx) => ctx.exists(join(ctx.home, ".roo")),
    dirs: (ctx) => ifParentExists(ctx, join(ctx.home, ".roo"), join(ctx.home, ".roo", "commands")),
  },
  {
    agent: "roo",
    label: "Roo Code project",
    format: "plain",
    scope: "project",
    namespacedPrompts: false,
    detect: (ctx) => ctx.exists(join(ctx.cwd, ".roo")),
    dirs: (ctx) => ifParentExists(ctx, join(ctx.cwd, ".roo"), join(ctx.cwd, ".roo", "commands")),
  },
  {
    agent: "opencode",
    label: "opencode",
    format: "args",
    scope: "global",
    namespacedPrompts: false,
    detect: (ctx) => ctx.exists(join(ctx.home, ".config", "opencode")),
    dirs: (ctx) => ifParentExists(ctx, join(ctx.home, ".config", "opencode"), join(ctx.home, ".config", "opencode", "command")),
  },
  {
    agent: "opencode",
    label: "opencode project",
    format: "args",
    scope: "project",
    namespacedPrompts: false,
    detect: (ctx) => ctx.exists(join(ctx.cwd, ".opencode")),
    dirs: (ctx) => ifParentExists(ctx, join(ctx.cwd, ".opencode"), join(ctx.cwd, ".opencode", "command")),
  },
];
