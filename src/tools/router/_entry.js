/** Tool entry resolution: entry path, dependency edge mapping, and the routed-skill lookup. */

import { _tools } from "./_hooks.js";
import { resolveToolName } from "./_contract.js";
import { SKILL_INDEPENDENT } from "./_helpers.js";
import { getSkillNames } from "./_skills.js";
import { skillDigest } from "../../core/cache/tool-cache/index.js";

/**
 * The entry a tool was registered through, or "unregistered" when no tool
 * answers to the name.
 *
 * The answer is what the tool declared, never a re-derivation from its name:
 * a tool whose skill is gone still reports the entry it arrived by, and a
 * renamed tool is resolved before the lookup.
 *
 * @param {string} name
 * @returns {string}
 */
function entryPathOf(name) {
  const { name: current } = resolveToolName(name);

  return _tools.find((tool) => tool.name === current)?.entry ?? "unregistered";
}

/**
 * Which skills produced this answer, and what their content was at the time.
 *
 * The recorded digests are what let one skill edit drop its dependents and
 * leave the rest of the cache alone. Three cases are attributable and the rest
 * are not, deliberately:
 *
 *   - the router names the route it chose and the alternatives it offered;
 *   - a skill tool is its own skill;
 *   - a check is the skill it checked.
 *
 * Everything else gets every skill, because a full-text search really does
 * depend on the whole corpus and because a wrong guess here is the one failure
 * that would show up as a stale answer.
 *
 * @param {string} name
 * @param {object} args
 * @param {object} result the deterministic core
 * @returns {Record<string, string>} skill name -> digest
 */
function dependenciesOf(name, args, result) {
  if (SKILL_INDEPENDENT.has(name)) {
    return {};
  }

  const withDigests = (names) => {
    const out = {};

    for (const skill of names) {
      const digest = skillDigest(skill);

      if (digest) {
        out[skill] = digest;
      }
    }

    return out;
  };

  if (name === "rule_tool") {
    const named = new Set();
    try {
      const answer = JSON.parse(result?.content?.[0]?.text ?? "{}");

      if (answer.route) {
        named.add(answer.route);
      }

      for (const alternative of answer.alternatives ?? []) {
        if (alternative?.route) {
          named.add(alternative.route);
        }
      }
    } catch {
      /* not JSON: fall through to the conservative answer */
    }

    if (named.size > 0) {
      return withDigests(named);
    }
  }

  if (entryPathOf(name) === "skill") {
    return withDigests([`rule-mcp-${name.replace(/^rule_tool_/, "").replaceAll("_", "-")}`]);
  }

  if (name === "rule_tool_check" && typeof args?.skill === "string") {
    const declared = withDigests([args.skill]);

    if (Object.keys(declared).length > 0) {
      return declared;
    }
  }

  return withDigests(getSkillNames());
}

/**
 * The skill a routing result chose, for the per-skill counts. Only the router
 * answers this; every other tool returns undefined and is counted by name.
 *
 * @param {string} name
 * @param {object} result
 * @returns {string|undefined}
 */
function routedSkillOf(name, result) {
  if (name !== "rule_tool") {
    return;
  }

  try {
    const parsed = JSON.parse(result?.content?.[0]?.text ?? "{}");

    return typeof parsed.route === "string" && parsed.route !== "none" ? parsed.route : undefined;
  } catch {
    return;
  }
}

/**
 * What reading the whole skill file would have cost, minus what routing
 * actually returned. A model of an alternative that did not happen, which is
 * why it is kept in its own field and never added to a measured total.
 *
 * @param {string} name
 * @param {object} core
 * @param {object} final
 * @returns {number|undefined}
 */

export { entryPathOf, dependenciesOf, routedSkillOf };
