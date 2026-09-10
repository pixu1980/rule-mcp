#!/usr/bin/env node



/**
 * @module scripts/build-version
 *
 * One version, three places: package.json, server.json and the newest
 * CHANGELOG.md release heading (OSS-21).
 *
 *   node scripts/build/version/index.mjs --check        exits 0 when they agree
 *   node scripts/build/version/index.mjs --apply 1.2.3  writes 1.2.3 everywhere
 *
 * --apply also stamps server.json packages[].version and inserts a bare
 * `## [1.2.3]` heading above the newest release heading. It never touches
 * the [Unreleased] section; entries arrive via `pnpm changelog`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (file) => readFileSync(join(root, file), "utf8");

function readVersions() {
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

function check() {
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

function apply(version) {
  if (!/^\d+\.\d+\.\d+$/u.test(version ?? "")) {
    process.stderr.write("usage: version/index.mjs --apply <x.y.z>\n");
    process.exitCode = 1;

    return;
  }

  const versions = readVersions();

  if (versions.every(([, current]) => current === version)) {
    process.stdout.write(`already at ${version}.\n`);

    return;
  }

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
  process.stdout.write(`stamped ${version} in package.json, server.json and CHANGELOG.md.\n`);
}

const [flag, value] = process.argv.slice(2);

if (flag === "--check") {
  check();
} else if (flag === "--apply") {
  apply(value);
} else {
  process.stderr.write("usage: version/index.mjs (--check|--apply <x.y.z>)\n");
  process.exitCode = 1;
}
