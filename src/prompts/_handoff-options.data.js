

/** @module prompts/handoff-options.data - modes, formats, completions, usage and defaults */

/** Handoff mode values accepted by the underlying tool. */
export const HANDOFF_MODES = ["handoff", "close-session"];

/** Output format values accepted by the underlying tool. */
export const HANDOFF_FORMATS = ["full", "brief", "minimal"];

/** All completion tokens offered to the client for the options argument. */
export const HANDOFF_COMPLETIONS = [
  "handoff",
  "close-session",
  "compress",
  "no-compress",
  "full",
  "brief",
  "minimal",
  "no-diff",
  "no-log",
  "no-context",
  "no-adrs",
  "no-roadmap",
  "no-archive",
  "max=",
  "help",
];

/** The usage block returned for `/rule-handoff help` and used in docs. */
export const HANDOFF_USAGE = `Usage: /rule-handoff [options]
Options (space-separated, all optional):
  handoff | close-session   mode (default: handoff)
  compress | no-compress    aggressively compress / keep output verbose (default: compress)
  full | brief | minimal    output format (default: full)
  no-diff                   omit the working-tree diff
  no-log                    omit the recent commit log
  no-context                omit .context/ values
  no-adrs                   omit the ADR summary
  no-roadmap                omit the roadmap/docs scan
  no-archive                render without archiving completed docs or repairing the ADR numbering
  max=<n>                   cap output to n tokens (0 = no limit)
  help                      show this usage list

Examples:
  /rule-handoff                         # all defaults → quick handoff
  /rule-handoff close-session           # full session close
  /rule-handoff no-compress minimal     # verbose, compressed one-line JSON
  /rule-handoff no-compress brief       # verbose brief format
  /rule-handoff no-diff                 # handoff without the diff
  /rule-handoff close-session no-diff no-log  # close without diff/log
  /rule-handoff no-compress max=2000    # verbose, token-capped`;

/** Default parsed values - identical to the tool's own defaults. */
export const DEFAULTS = Object.freeze({
  mode: "handoff",
  compress: true,
  format: "full",
  includeGitDiff: true,
  includeGitLog: true,
  includeContext: true,
  includeAdrs: true,
  includeRoadmap: true,
  closeout: true,
  maxTokens: 0,
  help: false,
});
