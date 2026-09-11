

/** No placeholder install host may survive outside frozen evidence (OSS-16). */
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FROZEN = new Set(["audits", "reviews", "plans", "handoff"]);

function tracked(dir, match) {
  const found = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      found.push(...tracked(full, match));
    } else if (match(entry)) {
      found.push(full);
    }
  }

  return found;
}

function markdown() {
  return tracked(join(root, "docs"), (name) => name.endsWith(".md")).filter((file) => file.split("/").every((part) => !FROZEN.has(part)));
}

function scripts() {
  const fromScripts = tracked(join(root, "scripts"), (name) => name.endsWith(".sh") || name.endsWith(".ps1"));
  const fromSrc = tracked(join(root, "src"), (name) => name.endsWith(".js") || name.endsWith(".mjs"));

  return [...fromScripts, ...fromSrc, join(root, "README.md")];
}

test("no tracked Markdown or script contains domain.example", () => {
  const hits = [];

  for (const file of [...markdown(), ...scripts()]) {
    const lines = readFileSync(file, "utf8").split("\n");

    for (const [index, line] of lines.entries()) {
      if (line.includes("domain.example")) {
        hits.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(hits, [], "placeholder hosts are not install instructions");
});
