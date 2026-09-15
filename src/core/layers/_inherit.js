/**
 * @module core/layers/inherit
 *
 * Guardrail composition by inheritance (ADR 079).
 *
 * A skill declares the rules it owns and the skills it takes rules from. This
 * walks that declaration depth-first, parents before the skill itself, so a
 * rule the skill redefines overrides the one it inherited: the nearest
 * definition of an id is the one that runs.
 *
 * Nothing here reads the filesystem. The caller passes a lookup, which is what
 * lets the layer resolution decide which copy of a skill answers before
 * composition begins.
 *
 * A malformed graph never throws: a cycle, a parent that is not there and a
 * chain too deep to be meant are each reported and stepped over, because a bad
 * `inherits:` line in one skill must not stop the server answering about the
 * other 88.
 */

/** How deep an inheritance chain may go before it stops being a declaration. */
const MAX_DEPTH = 32;

/**
 * What a layer knows about one skill.
 *
 * @typedef {object} SkillEntry
 * @property {string[]} [inherits] - the skills it takes rules from
 * @property {object[]} [guardrails] - the rules it owns
 */

/**
 * The rules that apply to a skill, its own last.
 *
 * @param {string} name - the skill to resolve
 * @param {(name: string) => SkillEntry|undefined} lookup
 * @returns {{ guardrails: object[], chain: string[], problems: object[] }}
 */
export function resolveInherited(name, lookup) {
  const problems = [];
  const chain = [];
  const collected = [];
  const visited = new Set();

  /** @param {string} current @param {string[]} path - the ancestors being resolved */
  function walk(current, path) {
    if (path.includes(current)) {
      problems.push({ skill: current, reason: `inheritance cycle: ${[...path, current].join(" -> ")}` });

      return;
    }

    if (visited.has(current)) {
      return; // a diamond: already contributed, and contributing twice would duplicate
    }

    if (path.length >= MAX_DEPTH) {
      problems.push({ skill: current, reason: `inheritance depth above ${MAX_DEPTH}, stopped at ${current}` });

      return;
    }

    const entry = lookup(current);

    if (!entry) {
      problems.push({ skill: current, reason: `inherits "${current}", which no layer defines` });

      return;
    }

    visited.add(current);

    for (const parent of entry.inherits ?? []) {
      walk(parent, [...path, current]);
    }

    chain.push(current);
    collected.push(...(entry.guardrails ?? []));
  }

  walk(name, []);

  // Last definition of an id wins, and it keeps the position of the first: a
  // child overriding a parent's rule replaces it where the parent put it,
  // rather than moving it to the end of the report.
  const byId = new Map();

  for (const rule of collected) {
    byId.set(rule.id, rule);
  }

  return { guardrails: [...byId.values()], chain, problems };
}
