/**
 * Every ADR a comment cites is an ADR that exists.
 *
 * Eight citations in the source pointed at decisions this repository does not
 * hold: they came from a numbering that was never migrated. A number that
 * points at no decision is worse than no number, because a reader spends the
 * lookup before finding that out.
 */
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ADR_DIR = "docs/adr";
const ROOTS = ["src", "scripts", "tests", "bin", "packages", "skills", "personas"];
const CITATION = /\bADR[\s-]*(\d{3})\b/g;

/** The numbers docs/adr actually holds. */
function existingAdrs() {
  return new Set(readdirSync(ADR_DIR).flatMap((name) => name.match(/^(\d{3})-/)?.[1] ?? []));
}

/** Every text file under the roots, repo-relative. */
function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      if (entry !== "node_modules") {
        collect(full, out);
      }
    } else if (/\.(?:m?js|md)$/.test(entry)) {
      out.push(full);
    }
  }

  return out;
}

test("every cited ADR number exists", () => {
  const known = existingAdrs();
  const dangling = [];

  for (const file of ROOTS.flatMap((root) => collect(root))) {
    // The ADR log cites its own supersessions; docs/adr is the source of truth
    // for what exists, so it cannot be dangling against itself.
    if (file.startsWith(`${ADR_DIR}/`)) {
      continue;
    }

    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(CITATION)) {
      if (!known.has(match[1])) {
        dangling.push(`${file}: ADR ${match[1]}`);
      }
    }
  }

  assert.deepEqual(dangling, [], "a number that points at no decision costs a reader the lookup and gives nothing back");
});

test("the ADR directory is the set this gate reads", () => {
  const known = existingAdrs();

  assert.ok(known.size > 70, `the log is there: ${known.size} ADRs`);
  assert.ok(known.has("079"), "including the most recent one, so the gate is not reading a stale list");
});
