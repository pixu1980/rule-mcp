

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
 *   handoff | close-session     → mode
 *   compress | no-compress      → compress = true | false (default: compress)
 *   full | brief | minimal      → format
 *   no-diff | no-log | no-context | no-adrs | no-roadmap → include* = false
 *   max=<n>                     → maxTokens = n
 *   help | --help | -h          → help (print usage, do not run the tool)
 */

import { DEFAULTS } from "./_handoff-options.data.js";

export { HANDOFF_COMPLETIONS, HANDOFF_FORMATS, HANDOFF_MODES, HANDOFF_USAGE } from "./_handoff-options.data.js";

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
      case "no-compress": {
        result.compress = false;
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
