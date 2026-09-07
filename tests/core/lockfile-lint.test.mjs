/**
 * Hardening 3.4 (F-C2): the lockfile is a supply-chain artifact, so CI reads it.
 *
 * A git:// or https:// dependency, or a package resolved from a registry that
 * is not npm, bypasses every audit and every provenance check that applies to
 * the registry. A missing integrity hash means the same bytes are not
 * guaranteed twice. None of these are visible in package.json.
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const lock = readFileSync(new URL("../../pnpm-lock.yaml", import.meta.url), "utf8");

test("every resolution carries an integrity hash or a local link", () => {
  const resolutions = [...lock.matchAll(/^\s+resolution: \{(.+)\}$/gm)].map(([, body]) => body);
  assert.ok(resolutions.length > 100, `expected a populated lockfile, saw ${resolutions.length} resolutions`);
  const unverifiable = resolutions.filter((body) => !body.includes("integrity:") && !body.includes("directory:") && !body.includes("type: directory"));
  assert.deepEqual(unverifiable, [], "a resolution without an integrity hash is not reproducible");
});

test("no dependency is fetched from git or an arbitrary URL", () => {
  const offenders = [...lock.matchAll(/^\s+resolution: \{(.*(?:tarball|repo|commit):.*)\}$/gm)].map(([, body]) => body);
  assert.deepEqual(offenders, [], "git and tarball dependencies bypass audit and provenance");
});

test("the registry is npm", () => {
  const foreign = [...lock.matchAll(/registry\.(?!npmjs\.org)[\w.]+/g)].map(([match]) => match);
  assert.deepEqual([...new Set(foreign)], [], "a second registry is a second trust root");
});

test("the security overrides are pinned exactly", () => {
  const workspace = readFileSync(new URL("../../pnpm-workspace.yaml", import.meta.url), "utf8");
  const overrides = workspace.slice(workspace.indexOf("overrides:"));
  const ranged = [...overrides.matchAll(/^ {2}'?([\w@/.-]+)'?: '?([\^~][^'\n]+)'?$/gm)].map(([, name]) => name);
  // brace-expansion is the documented exception: its allowlist spans majors
  // that different consumers require, so no single version satisfies it.
  assert.deepEqual(
    ranged.filter((name) => name !== "brace-expansion"),
    [],
    "overrides use exact versions at the latest release (ADR 070)",
  );
});
