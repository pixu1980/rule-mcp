/**
 * @module cli/paths
 *
 * Runtime path resolution for rule-mcp.
 * Provides paths for state, data, config, and skill directories.
 * All paths derive from a single home directory: `~/.rule-mcp`, one
 * visible root with `state/`, `data/`, `projects/`, `config/` underneath.
 */

export * from "./_runtime.js";
export * from "./_project.js";
export * from "./_repo.js";
