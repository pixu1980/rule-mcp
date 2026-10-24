

/**
 * @module test/skills/router-child-coverage
 *
 * Every area router lists every skill that sits under it.
 *
 * A router table is a list of links written by hand, so it drifts whenever a
 * skill is created, renamed or moved between areas: the leaf plan adds the
 * skill, the router keeps the old table, and a reader who lands on the router
 * cannot find it. The merge of three skills into `rule-mcp-process-ai` hit exactly
 * this, in both directions: two stale rows in `rule-mcp-styleguide` and one missing
 * row in `rule-mcp-process`.
 *
 * The gaps that already existed are recorded in `scripts/data/router-gaps.data.mjs`
 * and the list only shrinks.
 */

import { strict as assert } from "node:assert";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { ROUTER_GAPS } from "../../../../scripts/data/router-gaps.data.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const skillsRoot = join(root, "skills");

/** Every skill directory that has a SKILL.md. */
function skills() {
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(skillsRoot, entry.name, "SKILL.md")))
    .map((entry) => entry.name);
}

/** The children of one area: `rule-mcp-process` owns `rule-mcp-process-tdd`, not itself. */
function childrenOf(area, all) {
  return all.filter((name) => name.startsWith(`${area}-`));
}

test("each area router links every child under it", () => {
  const all = skills();
  // An area is `rule-mcp-<word>`. `rule-mcp` itself is the dispatcher, not an area, and its
  // table lists skills across every area on purpose.
  const areas = all.filter((name) => name !== "rule-mcp" && !name.includes("-", 4));
  const unlisted = [];

  for (const area of areas) {
    const router = readFileSync(join(skillsRoot, area, "SKILL.md"), "utf8");

    for (const child of childrenOf(area, all)) {
      if (!router.includes(`../${child}/SKILL.md`)) {
        unlisted.push(`${area} -> ${child}`);
      }
    }
  }

  const excused = new Set(Object.entries(ROUTER_GAPS).flatMap(([area, kids]) => kids.map((kid) => `${area} -> ${kid}`)));
  const fresh = unlisted.filter((gap) => !excused.has(gap));

  assert.deepEqual(fresh, [], `add these rows to their area router:\n  ${fresh.join("\n  ")}`);
});

test("the recorded gaps only shrink", () => {
  const all = skills();
  const fixed = [];

  for (const [area, kids] of Object.entries(ROUTER_GAPS)) {
    const router = readFileSync(join(skillsRoot, area, "SKILL.md"), "utf8");

    for (const kid of kids) {
      if (!all.includes(kid) || router.includes(`../${kid}/SKILL.md`)) {
        fixed.push(`${area} -> ${kid}`);
      }
    }
  }

  assert.deepEqual(fixed, [], `these entries are no longer gaps, delete them from router-gaps.data.mjs:\n  ${fixed.join("\n  ")}`);
});
