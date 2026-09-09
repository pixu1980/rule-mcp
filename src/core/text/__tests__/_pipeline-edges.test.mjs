/**
 * The compression pipeline's refusals: what it declines to touch, and what it
 * does with a value that is not text at all.
 *
 * The happy paths are pinned by the level, corpus and guard suites. These are
 * the arms that only run when a caller hands the pipeline something it must
 * leave alone - a non-string, a JSON body, a level that is off or misspelled,
 * a result whose content is not an array. Each of them is a decision, and an
 * unvisited decision is one nobody has checked.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { compressResult, compressSurfaceText, compressText } from "../_caveman.js";
import { classifyText, looksLikeYaml } from "../_classify.js";
import { cavemanEnabled, cavemanLevel, DEFAULT_LEVEL } from "../_level.js";
import { isSensitivePath, stripOuterFence } from "../_sensitive.js";

test("a value that is not a string comes back untouched", () => {
  for (const value of [undefined, null, 42, {}, []]) {
    assert.equal(compressText(value), value);
    assert.equal(compressSurfaceText(value).text, value);
  }

  assert.equal(compressText(""), "", "an empty string is already as short as it gets");
});

test("a JSON body is data, so no level compresses it", () => {
  const body = JSON.stringify({ route: "rule-frontend-react", sections: ["really just prose"] });

  for (const level of ["lite", "full", "ultra"]) {
    assert.equal(compressText(body, { level }), body, `${level} must not corrupt a payload`);
  }

  const surface = compressSurfaceText(body, { source: "caveman-resource" });
  assert.equal(surface.text, body);
  assert.equal(surface.saved, 0, "nothing removed is nothing booked");
});

test("level off is the identity on every entry point", () => {
  const text = "The value is really just very large.";

  assert.equal(compressText(text, { level: "off" }), text);
  assert.equal(compressSurfaceText(text, { level: "off" }).text, text);

  const result = { content: [{ type: "text", text }] };
  assert.equal(compressResult(result, { level: "off" }), result, "the same object, not a copy");
});

test("a result without an array of content is handed back as it came", () => {
  for (const result of [null, undefined, {}, { content: "not-an-array" }]) {
    assert.equal(compressResult(result), result);
  }
});

test("a non-text content item is left alone beside one that compresses", () => {
  const out = compressResult({
    content: [{ type: "image", data: "..." }, { type: "text" }, { type: "text", text: "The value is really just large." }],
  });

  assert.deepEqual(out.content[0], { type: "image", data: "..." }, "an image is not prose");
  assert.deepEqual(out.content[1], { type: "text" }, "a text item with no text is not prose either");
  assert.equal(out.content[2].text, "value is large.");
});

test("an unknown level falls back to the default instead of turning compression off", () => {
  const previous = process.env.RULE_MCP_CAVEMAN_LEVEL;
  process.env.RULE_MCP_CAVEMAN_LEVEL = "aggressive";

  try {
    assert.equal(cavemanLevel(), DEFAULT_LEVEL, "a typo must not silently stop compressing");
    assert.equal(cavemanEnabled(), true);
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_CAVEMAN_LEVEL;
    } else {
      process.env.RULE_MCP_CAVEMAN_LEVEL = previous;
    }
  }
});

test("a level named in any case, with any padding, still resolves", () => {
  const previous = process.env.RULE_MCP_CAVEMAN_LEVEL;
  process.env.RULE_MCP_CAVEMAN_LEVEL = "  ULTRA ";

  try {
    assert.equal(cavemanLevel(), "ultra");
  } finally {
    if (previous === undefined) {
      delete process.env.RULE_MCP_CAVEMAN_LEVEL;
    } else {
      process.env.RULE_MCP_CAVEMAN_LEVEL = previous;
    }
  }
});

test("classifyText reads the extension first and the content only without one", () => {
  assert.equal(classifyText("# Title\n\nprose", "notes.md"), "natural_language");
  assert.equal(classifyText("const a = 1;", "app.js"), "code");
  assert.equal(classifyText("{}", "tsconfig.json"), "config");
  assert.equal(classifyText("prose", "photo.png"), "unknown", "an extension nobody classified is not a guess");

  assert.equal(classifyText('{"a":1}'), "config", "a JSON body with no name is config");
  assert.equal(classifyText("---\nname: x\nkind: y\ntags: z\n"), "config", "so is a YAML one");
  assert.equal(classifyText("import x from 'y';\nexport const a = 1;\nconst b = 2;\n"), "code");
  assert.equal(classifyText("Just a paragraph of prose about nothing."), "natural_language");
  assert.equal(classifyText(""), "natural_language", "nothing to read is nothing to skip");
});

test("looksLikeYaml needs a majority, not a single colon", () => {
  assert.equal(looksLikeYaml(["name: rule", "kind: skill", "tags: two"]), true);
  assert.equal(looksLikeYaml(["A sentence about a thing.", "Another one.", "name: rule"]), false);
  assert.equal(looksLikeYaml([]), false, "no lines is not YAML");
  assert.equal(looksLikeYaml(["", " ".repeat(3)]), false, "blank lines are not YAML either");
});

test("the sensitive denylist reads names, paths and separators alike", () => {
  for (const name of [".env.local", "id_ed25519.pub", "~/.aws/credentials", "my_api_key.md", "server.pem"]) {
    assert.equal(isSensitivePath(name), true, `${name} must be refused`);
  }

  for (const value of ["README.md", "src/index.js", "", undefined, 42]) {
    assert.equal(isSensitivePath(value), false, `${value} is not a secret`);
  }
});

test("an outer fence that wraps the whole text is a wrapper, not content", () => {
  assert.equal(stripOuterFence("```markdown\n# Title\n```"), "# Title");
  assert.equal(stripOuterFence("# Title\n\n```js\nconst a = 1;\n```"), "# Title\n\n```js\nconst a = 1;\n```", "a fence inside the text is content");
  assert.equal(stripOuterFence("plain"), "plain");
});
