/**
 * @module scripts/build/version/commands
 *
 * The four things the version entry point can do: read the three places that
 * carry the version, check them, stamp a version everywhere, and print or apply
 * the version derived from the commits.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { refreshManifests } from "./_hashes.mjs";
import { deriveNextVersion } from "./_derive.mjs";

/** The repository root this module's tree belongs to. */
export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const read = (file) => readFileSync(join(root, file), "utf8");

/**
 * Every place the version is written: the two manifests and the newest CHANGELOG
 * release heading.
 *
 * @returns {Array<[string, string]>} place to version
 */
export function readVersions() {
  const manifest = JSON.parse(read("package.json"));
  const server = JSON.parse(read("server.json"));
  const headings = [...read("CHANGELOG.md").matchAll(/^## \[(.+?)\]/gmu)].map((match) => match[1]);
  const newest = headings.find((heading) => heading !== "Unreleased");

  return [
    ["package.json", manifest.version],
    ["server.json", server.version],
    ...server.packages.map((entry, index) => [`server.json packages[${index}]`, entry.version]),
    ["CHANGELOG.md", newest],
  ];
}

/** Print the in-sync verdict, or the disagreeing places and a non-zero exit. */
export function check() {
  const versions = readVersions();
  const distinct = new Set(versions.map(([, version]) => version));

  if (distinct.size === 1) {
    process.stdout.write(`version ${versions[0][1]} in sync (${versions.length} places).\n`);

    return;
  }

  for (const [place, version] of versions) {
    process.stderr.write(`${place}: ${version}\n`);
  }

  process.stderr.write("versions disagree - run with --apply <version>.\n");
  process.exitCode = 1;
}

/**
 * Stamp one version in the two manifests, insert its CHANGELOG heading and
 * refresh the packaging manifests.
 *
 * @param {string} version - `x.y.z`, optionally with a prerelease suffix
 */
export function apply(version) {
  // A prerelease suffix is part of the version this project ships next, and
  // the release workflow already reads the hyphen to mark the GitHub release.
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version ?? "")) {
    process.stderr.write("usage: version/index.mjs --apply <x.y.z[-prerelease]>\n");
    process.exitCode = 1;

    return;
  }

  const versions = readVersions();
  const oldPkg = versions[0][1];
  const stamp = (file, old) => {
    const text = read(file);
    const stamped = text.split(`"version": "${old}"`).join(`"version": "${version}"`);

    if (stamped === text) {
      process.stderr.write(`${file}: no "version": "${old}" found.\n`);
      process.exitCode = 1;

      return false;
    }

    writeFileSync(join(root, file), stamped);

    return true;
  };

  const olds = new Set(versions.map(([, current]) => current).filter(Boolean));

  for (const old of olds) {
    if (!stamp("package.json", old) || !stamp("server.json", old)) {
      return;
    }
  }

  const lines = read("CHANGELOG.md").split("\n");
  const at = lines.findIndex((line) => /^## \[((?!Unreleased).+?)\]/u.test(line));

  if (at === -1) {
    process.stderr.write("CHANGELOG.md: no release heading found.\n");
    process.exitCode = 1;

    return;
  }

  lines.splice(at, 0, `## [${version}]`, "");
  writeFileSync(join(root, "CHANGELOG.md"), lines.join("\n"));
  refreshManifests(root, version, oldPkg);
  process.stdout.write(`stamped ${version} in package.json, server.json, CHANGELOG.md and the manifests.\n`);
}

/** Print the next version derived from the commits since the newest tag. */
export function reportNext() {
  const current = readVersions()[0][1];
  const derived = deriveNextVersion(root, current);

  process.stdout.write(`${derived.version} (${derived.bump}) from ${current} over ${derived.commits} unreleased commit(s)\n`);

  for (const reason of derived.reasons) {
    process.stdout.write(`  ${reason}\n`);
  }
}

/** Derive the next version and stamp it everywhere --apply would. */
export function applyNext() {
  const current = readVersions()[0][1];
  const derived = deriveNextVersion(root, current);

  if (derived.bump === "none") {
    process.stderr.write("no unreleased feat, fix or breaking commit: nothing to bump.\n");
    process.exitCode = 1;

    return;
  }

  apply(derived.version);
}
