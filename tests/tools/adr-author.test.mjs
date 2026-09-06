/**
 * @module test/adr-author
 *
 * An ADR names the person who decided, not the tool that wrote the file.
 *
 * Every ADR carried `- **Author**: rule-mcp`, which is true about the
 * writer and useless about the decision: the docs-engineer audit raised it as
 * DOC-7, because a year later the question a reader has is who to ask, and the
 * answer was the name of a program. git already knows the answer.
 *
 * The fallback matters as much as the value. A container with no git identity
 * has nobody to name, and inventing one would be worse than saying the tool
 * wrote it.
 */

import test from "node:test";
import assert from "node:assert/strict";

const { adrAuthor, buildAdrBody } = await import("../../src/tools/adr/index.js");

test("the author is the git identity, name and address", () => {
  const author = adrAuthor((key) => (key === "user.name" ? "Ada Lovelace" : "ada@example.com"));

  assert.equal(author, "Ada Lovelace <ada@example.com>");
});

test("a name with no address stands on its own", () => {
  assert.equal(
    adrAuthor((key) => (key === "user.name" ? "Ada Lovelace" : "")),
    "Ada Lovelace",
  );
});

test("no git identity falls back to the tool that wrote the file", () => {
  assert.equal(
    adrAuthor(() => ""),
    "rule-mcp",
  );
  assert.equal(
    adrAuthor(() => {
      throw new Error("git: command not found");
    }),
    "rule-mcp",
  );
});

test("a written ADR carries that author in its header", () => {
  const body = buildAdrBody({
    number: 999,
    title: "A decision somebody took",
    status: "accepted",
    context: "why",
    decision: "what",
    consequences: "cost",
    tags: ["testing"],
    date: "2026-09-04",
    author: "Ada Lovelace <ada@example.com>",
  });

  assert.match(body, /^- \*\*Author\*\*: Ada Lovelace <ada@example\.com>$/m);
  assert.doesNotMatch(body, /\*\*Author\*\*: rule-mcp/, "the tool is the fallback, not the default");
});
