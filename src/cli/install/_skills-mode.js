

/** @module cli/install/skills-mode - the install that configures no server */

/**
 * Copy the skills where agents read them natively, and configure no MCP
 * server at all (ADR 079).
 *
 * `--mode skills` is not a transport. It trades every server-side guarantee -
 * the guardrail engine, the result cache, the compression, the routing - for
 * not running a server, which is a choice worth offering and worth naming.
 *
 * @param {{ global?: boolean }} opts
 */
export async function installSkillsOnly(opts = {}) {
  const { skillsInstallCommand } = await import("../skills-install/index.js");

  await skillsInstallCommand({ scope: opts.global === false ? "project" : "global", selectAll: true });
}
