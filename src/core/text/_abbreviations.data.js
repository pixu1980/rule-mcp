/**
 * @module core/text/abbreviations.data
 *
 * The `ultra` abbreviation map: technical nouns a reader of a status line
 * already knows in short form. Opt-in only, because an abbreviation is a
 * reading cost for anyone who does not know it - see the level table in
 * `docs/05-env-variables.md`.
 *
 * Plurals are listed on their own: `\bconfiguration\b` cannot match inside
 * "configurations", so the two entries never race.
 */

/** @type {Array<{ from: string, to: string, level: "ultra" }>} */
export const ABBREVIATIONS = [
  { from: "database", to: "DB", level: "ultra" },
  { from: "databases", to: "DBs", level: "ultra" },
  { from: "authentication", to: "auth", level: "ultra" },
  { from: "authorization", to: "authz", level: "ultra" },
  { from: "configuration", to: "config", level: "ultra" },
  { from: "configurations", to: "configs", level: "ultra" },
  { from: "request", to: "req", level: "ultra" },
  { from: "requests", to: "reqs", level: "ultra" },
  { from: "response", to: "res", level: "ultra" },
  { from: "function", to: "fn", level: "ultra" },
  { from: "functions", to: "fns", level: "ultra" },
  { from: "implementation", to: "impl", level: "ultra" },
  { from: "implementations", to: "impls", level: "ultra" },
  { from: "repository", to: "repo", level: "ultra" },
  { from: "repositories", to: "repos", level: "ultra" },
  { from: "environment", to: "env", level: "ultra" },
  { from: "environments", to: "envs", level: "ultra" },
  { from: "directory", to: "dir", level: "ultra" },
  { from: "directories", to: "dirs", level: "ultra" },
  { from: "parameter", to: "param", level: "ultra" },
  { from: "parameters", to: "params", level: "ultra" },
  { from: "argument", to: "arg", level: "ultra" },
  { from: "arguments", to: "args", level: "ultra" },
  { from: "documentation", to: "docs", level: "ultra" },
  { from: "dependency", to: "dep", level: "ultra" },
  { from: "dependencies", to: "deps", level: "ultra" },
  { from: "application", to: "app", level: "ultra" },
  { from: "applications", to: "apps", level: "ultra" },
  { from: "development", to: "dev", level: "ultra" },
  { from: "production", to: "prod", level: "ultra" },
  { from: "performance", to: "perf", level: "ultra" },
  { from: "specification", to: "spec", level: "ultra" },
  { from: "specifications", to: "specs", level: "ultra" },
  { from: "initialization", to: "init", level: "ultra" },
  { from: "asynchronous", to: "async", level: "ultra" },
  { from: "synchronous", to: "sync", level: "ultra" },
  { from: "maximum", to: "max", level: "ultra" },
  { from: "minimum", to: "min", level: "ultra" },
];
