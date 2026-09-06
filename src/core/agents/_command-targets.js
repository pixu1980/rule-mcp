/**
 * @module core/agents/command-targets
 *
 * Where the clean `/rule-*` slash commands are written, per agent/IDE.
 *
 * Every MCP host namespaces the prompts a server exposes, and none of them let a
 * server drop that prefix:
 *   - Claude Code → `/rule-mcp:rule-backend (MCP)`
 *   - VS Code (Copilot Chat) → `/mcp.rule-mcp.rule-backend`
 * The only surface that yields a bare `/rule-backend` is the host's own
 * command/prompt FILES. This module is the single registry of those file
 * locations, so "clean commands everywhere" is a property of the codebase rather
 * than a per-installer accident:
 *
 *   1. {@link COMMAND_TARGETS} declares every directory + render format.
 *   2. {@link AGENTS_WITHOUT_COMMAND_SURFACE} documents the remaining gaps -
 *      an agent may be in one list or the other, never in neither
 *      (enforced by test/agent-command-targets.test.mjs).
 *   3. Hosts that namespace prompts AND receive files also get
 *      `RULE_MCP_NO_PROMPTS=1` ({@link suppressesMcpPrompts}), so the clean
 *      commands replace the prefixed MCP entries instead of duplicating them.
 *
 * Resolution is pure: `exists`/`listDir` are injected, so the whole registry is
 * unit-testable for any platform without touching the filesystem.
 *
 * @see module:core/agents/commands - the command bodies and render formats
 * @see module:cli/install - installs/removes the resolved targets
 */

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Agents with no discoverable command-file surface. Each entry states WHY, so a
 * gap is a documented decision instead of an oversight. Hosts listed here keep
 * the namespaced MCP prompts (still functional, just prefixed).
 */
export const AGENTS_WITHOUT_COMMAND_SURFACE = {
  codex:
    "Codex CLI exposes MCP prompts as slash commands itself; its custom-prompt directory is not verified against a published spec, so writing files there would be a guess.",
  copilot:
    "GitHub Copilot CLI gets a custom agent file (~/.copilot/agents); its prompt-file directory is not verified against a published spec.",
  zed: "Zed stores its rules/prompt library in profile storage, not in discoverable per-command files.",
  antigravity: "No published custom-command file location; MCP prompts remain the entry point.",
  kilo: "Kilo CLI command directory is not verified against a published spec.",
  kimi: "Kimi CLI command directory is not verified against a published spec.",
  vibe: "Mistral Vibe command directory is not verified against a published spec.",
  grok: "Grok Build command directory is not verified against a published spec.",
  droid: "Factory Droid command directory is not verified against a published spec.",
  kiro: "AWS Kiro command directory is not verified against a published spec.",
  qwen: "Qwen Code command directory is not verified against a published spec.",
  jetbrains: "JetBrains AI Assistant has no user-authored slash-command files; MCP prompts are the only entry point.",
  neovim: "Editor-level MCP plugins expose prompts directly; there is no command-file convention to write to.",
  emacs: "mcp.el exposes prompts directly; there is no command-file convention to write to.",
  devin:
    "Devin runs commands in its own workspace runtime, not from local slash-command files; MCP prompts remain the entry point.",
};

/** Default resolution context - real filesystem, real HOME. */
const defaultContext = () => ({
  home: homedir(),
  cwd: process.cwd(),
  platform: process.platform,
  env: process.env,
  exists: (path) => existsSync(path),
  listDir: (path) => {
    try {
      return readdirSync(path, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch {
      return [];
    }
  },
});

/** Roaming application-data root for editors that follow the VS Code layout. */
const editorDataRoot = ({ home, platform, env }) => {
  if (platform === "darwin") {
    return join(home, "Library", "Application Support");
  }

  if (platform === "win32") {
    return env.APPDATA || join(home, "AppData", "Roaming");
  }

  return join(home, ".config");
};

/**
 * VS Code user-data directories, stable variant first. Prompt files are
 * profile-scoped, so each existing `profiles/<id>` gets its own dir too.
 */
const VSCODE_VARIANTS = ["Code", "Code - Insiders", "Code - OSS", "VSCodium"];

const vscodePromptDirs = (ctx) => {
  const root = editorDataRoot(ctx);
  const dirs = [];

  for (const [index, variant] of VSCODE_VARIANTS.entries()) {
    const userDir = join(root, variant, "User");
    // The stable channel is always targeted (it is the default install); other
    // variants only when the editor actually has a user-data directory.
    if (index > 0 && !ctx.exists(userDir)) {
      continue;
    }

    dirs.push(join(userDir, "prompts"));

    for (const profile of ctx.listDir(join(userDir, "profiles"))) {
      dirs.push(join(userDir, "profiles", profile, "prompts"));
    }
  }

  return dirs;
};

/**
 * First existing directory from a list of candidates. `ctx.force` (an explicit
 * `install --agent <name>`) falls back to the first candidate so the user gets
 * the commands they asked for even on a fresh machine.
 */
const firstExisting = (ctx, candidates) => {
  const found = candidates.find(({ gate }) => ctx.exists(gate));

  if (found) {
    return [found.dir];
  }

  return ctx.force ? [candidates[0].dir] : [];
};

/** Directory used only when its parent already exists (or the install is explicit). */
const ifParentExists = (ctx, parent, dir) => (ctx.force || ctx.exists(parent) ? [dir] : []);

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
    // bare `/rule-*` - keep them and add the files.
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
    detect: (ctx) =>
      ctx.exists(join(ctx.home, ".codeium", "windsurf")) || ctx.exists(join(ctx.home, ".config", "windsurf")),
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
    dirs: (ctx) =>
      ifParentExists(ctx, join(ctx.home, ".config", "opencode"), join(ctx.home, ".config", "opencode", "command")),
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

/** Agents that receive clean command files, sorted. */
export function agentsWithCleanCommands() {
  return [...new Set(COMMAND_TARGETS.map((target) => target.agent))].sort((a, b) => a.localeCompare(b));
}

/**
 * Whether this agent's host namespaces MCP prompts AND gets clean command files
 * instead - i.e. whether the server should hide its prompts for that host.
 *
 * @param {string} agent
 * @returns {boolean}
 */
export function suppressesMcpPrompts(agent) {
  return COMMAND_TARGETS.some((target) => target.agent === agent && target.namespacedPrompts);
}

/**
 * Resolve command targets to concrete directories.
 *
 * @param {object} [options]
 * @param {string} [options.agent] - only this agent (gates are skipped: an
 *   explicit install targets the agent even if nothing is detected yet)
 * @param {boolean} [options.detectedOnly] - only agents present on this machine
 * @param {string} [options.home] @param {string} [options.cwd]
 * @param {string} [options.platform] @param {object} [options.env]
 * @param {(path: string) => boolean} [options.exists]
 * @param {(path: string) => string[]} [options.listDir]
 * @returns {Array<{ agent: string, label: string, format: string, scope: string, dir: string }>}
 */
export function resolveCommandTargets(options = {}) {
  const base = { ...defaultContext(), ...options };
  const resolved = [];

  for (const target of COMMAND_TARGETS) {
    if (options.agent && target.agent !== options.agent) {
      continue;
    }
    // An explicit single-agent install forces its user-level directories into
    // existence; project directories are never created on spec, and a sweep over
    // every agent (detectedOnly) only fills what is already there.
    const ctx = { ...base, force: Boolean(options.agent) && !options.detectedOnly && target.scope === "global" };

    if (options.detectedOnly && !target.detect(ctx)) {
      continue;
    }

    for (const dir of target.dirs(ctx)) {
      resolved.push({ agent: target.agent, label: target.label, format: target.format, scope: target.scope, dir });
    }
  }

  return resolved;
}
