/**
 * @module scripts/build-version/hashes - keep the distribution manifests on
 * the release: version fields, tarball URLs and hashes, recomputed from a
 * throwaway pack that leaves nothing behind.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Bump manifest version fields, tarball URLs and hashes from a throwaway pack.
 *
 * @param {string} root - repository root
 * @param {string} version - version to stamp
 * @param {string} oldPkg - version being replaced
 */
export function refreshManifests(root, version, oldPkg) {
  const tmp = mkdtempSync(join(tmpdir(), "rule-mcp-version-"));

  try {
    execFileSync("pnpm", ["pack", "--pack-destination", tmp], { cwd: root, stdio: "pipe" });
    const tgz = readdirSync(tmp).find((name) => name.endsWith(".tgz"));

    if (!tgz) {
      process.stderr.write("version: pack produced no tarball, manifest hashes left stale.\n");
      process.exitCode = 1;

      return;
    }

    const digest = createHash("sha256")
      .update(readFileSync(join(tmp, tgz)))
      .digest("hex");
    const bump = (file) => {
      const text = readFileSync(file, "utf8")
        .split(`"version": "${oldPkg}"`)
        .join(`"version": "${version}"`)
        .split(`PackageVersion: "${oldPkg}"`)
        .join(`PackageVersion: "${version}"`)
        .split(`v${oldPkg}/`)
        .join(`v${version}/`)
        .split(`-${oldPkg}.tgz`)
        .join(`-${version}.tgz`)
        .replace(/"hash": "[0-9a-f]{64}"/u, `"hash": "${digest}"`)
        .replace(/InstallerSha256: [0-9a-f]{64}/u, `InstallerSha256: ${digest}`);
      writeFileSync(file, text);
    };

    bump(join(root, ".github", "scoop", "rule-mcp.json"));
    bump(join(root, ".github", "winget", "pixu1980.rule-mcp.yaml"));
    process.stdout.write(`version: manifest hashes refreshed (${digest.slice(0, 12)}...).\n`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
