

/** The docs site generator emits every chapter and ADR with resolving links. */
import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildSite, collectPages } from "../build.mjs";

const root = join(import.meta.dirname, "..", "..", "..");

test("every chapter and ADR becomes a page", () => {
  const pages = collectPages(root);
  const outs = pages.map((page) => page.out);

  for (let number = 1; number <= 15; number++) {
    const prefix = `docs/${String(number).padStart(2, "0")}-`;

    assert.ok(
      outs.some((out) => out.startsWith(prefix) && out.endsWith(".html")),
      `chapter ${prefix}* has no page`,
    );
  }

  assert.ok(outs.includes("index.html"), "the root README becomes index.html");
  assert.ok(
    outs.some((out) => out === "docs/adr/ADR.html"),
    "the ADR index becomes a page",
  );
  assert.ok(outs.filter((out) => out.startsWith("docs/adr/") && out.endsWith(".html")).length > 80, "every ADR file becomes a page");
});

test("the emitted site has no dead internal links", () => {
  const outDir = mkdtempSync(join(tmpdir(), "rule-site-"));
  const pages = buildSite({ projectDir: root, outDir });
  const emitted = new Set(pages.map((page) => page.out));
  const dead = [];

  for (const page of pages) {
    const html = readFileSync(join(outDir, page.out), "utf8");

    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/gu)) {
      const target = match[1];

      if (/^(?:https?:|mailto:|#|data:)/u.test(target)) {
        continue;
      }

      const hash = target.indexOf("#");
      const path = hash === -1 ? target : target.slice(0, hash);
      const resolved = join(page.out, "..", path);

      if (!emitted.has(resolved) && !existsSync(join(outDir, resolved))) {
        dead.push(`${page.out}: ${target}`);
      }
    }
  }

  assert.deepEqual(dead, [], "an internal link must resolve to an emitted page or asset");
});

test("the chapters on disk are the chapters on the site", () => {
  const chapters = readdirSync(join(root, "docs")).filter((name) => /^\d\d-.*\.md$/u.test(name));

  assert.equal(chapters.length, 15, "the handbook is fifteen chapters");
});
