/** The structure the site adds to Markdown that holds no HTML. */
import { strict as assert } from "node:assert";
import test from "node:test";

import { marked } from "marked";

import { addHeadingIds, decorate, decorateHome, decorateRequestPath } from "../_decorate.mjs";

const HOME = `# Name

**Lead.**

Body.

- **82 skills**

[Go](a.md) [More](b.md)

## How it works

1. **Route.** Step.

## Start here

### [One](a.md)

First.

### [Two](b.md)

Second.

## Project

Links.

## What the server does

Prose with no link.
`;

test("the home page gets its hero, stats, call to action, flow and cards", () => {
  const html = decorateHome(marked.parse(HOME));

  assert.match(html, /<h1>Name<\/h1>\n<section data-part="hero">/u);
  assert.match(html, /<ul data-part="stats">/u);
  assert.match(html, /<p data-part="cta"><a href="a.md">Go<\/a>/u);
  assert.match(html, /<section data-part="flow">\n<h2>How it works<\/h2>/u);
  assert.equal(html.match(/<article>/gu).length, 2, "one card per third-level heading");
  assert.match(html, /<section data-part="closing">\n<h2>What the server does<\/h2>/u, "the closing prose is one band under the cards");
  assert.doesNotMatch(html, /<h2>Project<\/h2>/u, "the README's repository prose is not part of the site home");
});

test("a home page with no matching heading keeps the hero and drops the rest", () => {
  const html = decorateHome(marked.parse("# Name\n\nBody.\n\n## Other\n\nText.\n"));

  assert.match(html, /<section data-part="hero">/u);
  assert.doesNotMatch(html, /data-part="(?:flow|cards|closing)"/u);
  assert.doesNotMatch(html, /<h2>Other<\/h2>/u, "a section the home page does not place is not emitted");
});

test("the request path list becomes the diagram, and each bold lead a step title", () => {
  const html = decorateRequestPath(marked.parse("## Request path\n\nIntro.\n\n1. **Agent.** Sends `x`.\n2. **Router.** Picks.\n"));

  assert.match(html, /<ol data-part="architecture-diagram" aria-label="[^"]+">/u);
  assert.match(html, /<li data-part="step">\n<h3>Agent<\/h3>\n<p>Sends <code>x<\/code>\.<\/p>\n<\/li>/u);
  assert.equal(html.match(/data-part="step"/gu).length, 2);
});

test("a page without the heading is left as it is", () => {
  const html = marked.parse("## Other\n\n1. **Agent.** Sends.\n");

  assert.equal(decorateRequestPath(html), html);
});

test("headings get GitHub slugs, and a repeated heading a suffix", () => {
  const html = addHeadingIds("<h2>Install &amp; run</h2><h3><code>rule_tool</code></h3><h2>Same</h2><h2>Same</h2><h1>Title</h1>");

  assert.match(html, /<h2 id="install--run">/u);
  assert.match(html, /<h3 id="rule_tool">/u);
  assert.match(html, /<h2 id="same">Same<\/h2><h2 id="same-1">Same<\/h2>/u);
  assert.match(html, /<h1>Title<\/h1>/u, "the page title keeps no id");
});

test("each route gets its own decoration and the rest none", () => {
  const home = marked.parse(HOME);
  const path = marked.parse("## Request path\n\n1. **A.** B.\n");

  assert.match(decorate(home, "index.html"), /data-part="hero"/u);
  assert.match(decorate(path, "docs/architecture.html"), /data-part="step"/u);
  assert.equal(decorate(path, "docs/cli.html"), path);
});
