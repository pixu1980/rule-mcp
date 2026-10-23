import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * The documented install must not point at the npm registry (OSS-4).
 *
 * The package is not published, so every `pnpm add -g rule-mcp`
 * or `npm install -g rule-mcp` instruction is a 404. The supported
 * route is a clone plus the installer launcher, with exactly one
 * allow-listed compatibility note (fenced by the markers below in
 * docs/01-getting-started.md) stating that a registry install applies
 * only once the package is published.
 *
 * Frozen evidence (audits, reviews, plans, handoffs) is out of scope:
 * those documents record the finding itself and must not be rewritten.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLAIM = /(?:pnpm add -g|npm install -g)\s+rule-mcp/u;
const ALLOW_START = "<!-- install-claims:allow-start -->";
const ALLOW_END = "<!-- install-claims:allow-end -->";
const FROZEN = new Set(["audits", "reviews", "plans", "handoff"]);

function stripAllowed(text) {
  const lines = text.split("\n");
  const kept = [];
  let inside = false;

  for (const line of lines) {
    if (line.includes(ALLOW_START)) {
      inside = true;

      continue;
    }

    if (line.includes(ALLOW_END)) {
      inside = false;

      continue;
    }

    if (!inside) {
      kept.push(line);
    }
  }

  return kept;
}

function docFiles() {
  const files = ["README.md"];
  const walk = (dir) => {
    for (const entry of readdirSync(join(root, dir))) {
      const rel = `${dir}/${entry}`;

      if (statSync(join(root, rel)).isDirectory()) {
        walk(rel);
      } else if (entry.endsWith(".md")) {
        files.push(rel);
      }
    }
  };

  for (const entry of readdirSync(join(root, "docs"))) {
    if (FROZEN.has(entry)) {
      continue;
    }

    if (statSync(join(root, "docs", entry)).isDirectory()) {
      walk(`docs/${entry}`);
    } else if (entry.endsWith(".md")) {
      files.push(`docs/${entry}`);
    }
  }

  return files;
}

function scriptFiles() {
  const candidates = ["scripts/install.sh", "scripts/install.ps1", "scripts/uninstall.sh", "scripts/uninstall.ps1"];

  return candidates.filter((file) => existsSync(join(root, file)));
}

test("no registry install claims outside the allow-listed note", () => {
  const hits = [];

  for (const file of [...docFiles(), ...scriptFiles()]) {
    const lines = stripAllowed(readFileSync(join(root, file), "utf8"));

    for (const [index, line] of lines.entries()) {
      if (CLAIM.test(line)) {
        hits.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(hits, [], "install from a clone plus the launcher - the registry package does not exist yet (OSS-4)");
});
