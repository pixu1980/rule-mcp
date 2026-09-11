

/** Every relative link in docs/ must resolve - the site cannot ship dead links. */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const docs = join(root, "docs");
const LINK = /!?\[[^\]]*\]\(([^)\s]+)\)/gu;

function markdownFiles(dir) {
  const found = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      found.push(...markdownFiles(full));
    } else if (entry.endsWith(".md")) {
      found.push(full);
    }
  }

  return found;
}

test("every relative link in docs/ resolves", () => {
  const dead = [];

  for (const file of markdownFiles(docs)) {
    const text = readFileSync(file, "utf8");

    for (const match of text.matchAll(LINK)) {
      const target = match[1];

      if (/^(?:https?:|mailto:|#)/u.test(target)) {
        continue;
      }

      const hash = target.indexOf("#");
      const path = hash === -1 ? target : target.slice(0, hash);

      if (path === "") {
        continue;
      }

      if (!existsSync(resolve(dirname(file), path))) {
        dead.push(`${file}: ${target}`);
      }
    }
  }

  assert.deepEqual(dead, [], "a dead link ships a 404");
});
