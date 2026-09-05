/**
 * @module prompts/handoff-options
 *
 * Compact slash-command vocabulary for `/rule-handoff`.
 *
 * `/rule-handoff` accepts a single free-form `options` string of
 * space-separated tokens. This module translates that vocabulary into the
 * concrete arguments of the `rule_tool_process_handoff` tool, so the prompt
 * handler can tell the model exactly which values to pass - no ambiguity.
 *
 * Vocabulary:
 *   handoff | close-session   → mode
 *   compress                  → compress = true
 *   full | brief | minimal    → format
 *   no-diff | no-log | no-context | no-adrs | no-roadmap → include* = false
 *   max=<n>                   → maxTokens = n
 *   help | --help | -h        → help (print usage, do not run the tool)
 */

/** Handoff mode values accepted by the underlying tool. */
export const HANDOFF_MODES = ["handoff", "close-session"];

/** Output format values accepted by the underlying tool. */
export const HANDOFF_FORMATS = ["full", "brief", "minimal"];

/** All completion tokens offered to the client for the options argument. */
export const HANDOFF_COMPLETIONS = [
  "handoff",
  "close-session",
  "compress",
  "full",
  "brief",
  "minimal",
  "no-diff",
  "no-log",
  "no-context",
  "no-adrs",
  "no-roadmap",
  "max=",
  "help",
];

/** The usage block returned for `/rule-handoff help` and used in docs. */
export const HANDOFF_USAGE = `Usage: /rule-handoff [options]
Options (space-separated, all optional):
  handoff | close-session   mode (default: handoff)
  compress                  aggressively compress the output
  full | brief | minimal    output format (default: full)
  no-diff                   omit the working-tree diff
  no-log                    omit the recent commit log
  no-context                omit .context/ values
  no-adrs                   omit the ADR summary
  no-roadmap                omit the roadmap/docs scan
  max=<n>                   cap output to n tokens (0 = no limit)
  help                      show this usage list

Examples:
  /rule-handoff                                  # all defaults → quick handoff
  /rule-handoff close-session                    # full session close
  /rule-handoff compress minimal                 # compressed one-line JSON
  /rule-handoff brief                            # brief format
  /rule-handoff no-diff                          # handoff without the diff
  /rule-handoff close-session no-diff no-log     # close without diff/log
  /rule-handoff compress max=2000                # compressed, token-capped`;

/** Default parsed values - identical to the tool's own defaults. */
const DEFAULTS = Object.freeze({
  mode: "handoff",
  compress: false,
  format: "full",
  includeGitDiff: true,
  includeGitLog: true,
  includeContext: true,
  includeAdrs: true,
  includeRoadmap: true,
  maxTokens: 0,
  help: false,
});

/**
 * Translate a `/rule-handoff` options string into concrete tool arguments.
 * Unknown tokens are ignored (the tool's zod schema validates the rest).
 *
 * @param {string} [raw] - space-separated token list (may be undefined/empty)
 * @returns {{ mode: string, compress: boolean, format: string,
 *             includeGitDiff: boolean, includeGitLog: boolean,
 *             includeContext: boolean, includeAdrs: boolean,
 *             includeRoadmap: boolean, maxTokens: number, help: boolean }}
 */
export function parseHandoffOptions(raw) {
  const result = { ...DEFAULTS };

  if (!raw) {
    return result;
  }

  for (const token of String(raw).trim().split(/\s+/)) {
    if (!token) {
      continue;
    }

    switch (token) {
      case "handoff":
      case "close-session": {
        result.mode = token;
        break;
      }
      case "compress": {
        result.compress = true;
        break;
      }
      case "full":
      case "brief":
      case "minimal": {
        result.format = token;
        break;
      }
      case "no-diff": {
        result.includeGitDiff = false;
        break;
      }
      case "no-log": {
        result.includeGitLog = false;
        break;
      }
      case "no-context": {
        result.includeContext = false;
        break;
      }
      case "no-adrs": {
        result.includeAdrs = false;
        break;
      }
      case "no-roadmap": {
        result.includeRoadmap = false;
        break;
      }
      case "help":
      case "--help":
      case "-h": {
        result.help = true;
        break;
      }
      default: {
        const max = /^max=(\d+)$/.exec(token);

        if (max) {
          result.maxTokens = parseInt(max[1], 10);
        }

        break; // unknown token: ignore
      }
    }
  }

  return result;
}
