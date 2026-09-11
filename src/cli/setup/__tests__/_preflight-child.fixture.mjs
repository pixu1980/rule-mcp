

/**
 * Child entry for the starved-environment preflight test.
 *
 * The parent spawns this file with a cwd that is not a checkout, an empty
 * PATH, and RULE_MCP_REPO_ROOT pointed at that same empty dir. It
 * imports _preflight.js and prints the checks as JSON. Kept out of process
 * on purpose: chdir and PATH surgery must never leak into the suite.
 */
const { preflight } = await import("../_preflight.js");

process.stdout.write(`${JSON.stringify(preflight())}\n`);
