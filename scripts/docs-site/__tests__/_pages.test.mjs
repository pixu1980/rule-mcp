/** The route model: which public sources become pages, and what the menus list. */
import { strict as assert } from "node:assert";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { collectPages } from "../build.mjs";
import { PRIMARY_NAV, REFERENCE_NAV } from "../_nav.mjs";

const root = join(import.meta.dirname, "..", "..", "..");

test("public pages exclude ADR and handoff trees, and carry no chapter numbers", () => {
  const outs = collectPages(root).map((page) => page.out);

  assert.ok(outs.includes("index.html"), "the root README becomes index.html");
  assert.ok(outs.includes("docs/getting-started.html"));
  assert.ok(outs.includes("docs/surface-map.html"));
  assert.ok(outs.includes("docs/instructions.html"));
  assert.equal(outs.filter((out) => out.startsWith("docs/adr/")).length, 0, "ADR files are not emitted");
  assert.equal(outs.filter((out) => out.startsWith("docs/handoff/")).length, 0, "handoff files are not emitted");
  assert.deepEqual(
    outs.filter((out) => /(?:^|\/)\d\d-/u.test(out)),
    [],
    "the chapter number is a repository device: a route must not carry it",
  );
});

test("a merged source has no route of its own and lands on its composed page", () => {
  const outs = collectPages(root).map((page) => page.out);

  assert.ok(!outs.includes("docs/agent-instructions.html"), "03 is merged, not published alone");
  assert.ok(!outs.includes("docs/12-instructions.html"), "the numbered route is gone");
  assert.equal(outs.filter((out) => out === "docs/instructions.html").length, 1);
});

test("primary nav is Home / Getting Started / Reference", () => {
  assert.deepEqual(
    PRIMARY_NAV.map((item) => item.title),
    ["Home", "Getting Started", "Reference"],
  );
});

test("reference TOC has the fixed ten entries", () => {
  assert.equal(REFERENCE_NAV.length, 10);
  assert.deepEqual(
    REFERENCE_NAV.map((item) => item.title),
    ["Overview", "Architecture", "Surface map", "Instructions", "Prompts", "Guardrails", "Personas", "Resources", "CLI", "Env vars"],
  );
  assert.deepEqual(
    REFERENCE_NAV.filter((item) => /(?:^|\/)\d\d-/u.test(item.out)),
    [],
    "a reference route must not carry a chapter number",
  );
});

test("handbook numbered chapters include the surface map", () => {
  const chapters = readdirSync(join(root, "docs")).filter((name) => /^\d\d-.*\.md$/u.test(name));

  assert.ok(chapters.includes("17-surface-map.md"));
  assert.ok(chapters.length >= 17);
});
