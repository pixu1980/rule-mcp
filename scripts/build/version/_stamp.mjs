/**
 * @module scripts/build/version/stamp
 *
 * One number, every manifest. The release stamps the root manifest, server.json
 * and every workspace package, because a package that keeps an older version
 * publishes that older version. It stamps the `workspace:x.y.z` specifiers too:
 * a specifier that names a version the package no longer has makes
 * `pnpm install` refuse the tree, so the lockfile moves with it.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every workspace package manifest, sorted. A tree with no `packages/` holds
 * none, which is what a scratch tree in a test looks like.
 *
 * @param {string} root
 * @returns {string[]}
 */
export function workspaceManifests(root) {
  const packages = join(root, "packages");

  if (!existsSync(packages)) {
    return [];
  }

  return readdirSync(packages)
    .filter((entry) => entry !== "node_modules" && existsSync(join(packages, entry, "package.json")))
    .map((entry) => `packages/${entry}/package.json`)
    .sort();
}

/**
 * The files a stamp touches, in order.
 *
 * @param {string} root
 * @returns {string[]}
 */
export function manifestFiles(root) {
  return ["package.json", "server.json", ...workspaceManifests(root)];
}

/**
 * True when a manifest names a sibling package at a version other than this one.
 *
 * @param {string} root
 * @param {string} file
 * @param {string} version
 * @returns {boolean}
 */
export function staleSpecifier(root, file, version) {
  const text = readFileSync(join(root, file), "utf8");

  return [...text.matchAll(/"workspace:([^"]+)"/gu)].some((match) => match[1] !== version);
}

/**
 * Write the version into every manifest that carries it, and refresh the
 * lockfile when a specifier moved.
 *
 * @param {string} root
 * @param {string} version
 * @returns {{ stamped: number, specifiers: boolean, ok: boolean }}
 */
export function stampEverywhere(root, version) {
  let stamped = 0;
  let specifiers = false;

  for (const file of manifestFiles(root)) {
    const path = join(root, file);
    const text = readFileSync(path, "utf8");
    const current = JSON.parse(text).version;

    if (current === undefined) {
      process.stderr.write(`${file}: no version field.\n`);

      return { stamped, specifiers, ok: false };
    }

    const next = text
      .split(`"version": "${current}"`)
      .join(`"version": "${version}"`)
      .replaceAll(/"workspace:[^"]+"/gu, `"workspace:${version}"`);

    if (next === text) {
      continue;
    }

    writeFileSync(path, next);
    stamped += 1;
    specifiers = specifiers || /"workspace:[^"]+"/u.test(text);
  }

  if (!specifiers) {
    return { stamped, specifiers, ok: true };
  }

  // The lockfile records the specifier it resolved, so it moves with it.
  const install = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["install", "--lockfile-only"], { cwd: root, stdio: "inherit" });

  if (install.status !== 0) {
    process.stderr.write("pnpm install --lockfile-only failed: the lockfile still names the old version.\n");

    return { stamped, specifiers, ok: false };
  }

  return { stamped, specifiers, ok: true };
}
