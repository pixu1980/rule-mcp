

/**
 * PERF-1.3 and PERF-3.4: what `rule_tool_compress` refuses, and what it guards.
 *
 * The tool is the one place where the original and the compressed text are
 * both in hand, so it is the one place that can refuse to compress a file that
 * looks like a credential and the one place that can hand back the original
 * when a pass broke structure.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { isSensitivePath } from "../../core/text/_sensitive.js";
import { compress } from "../_compress.js";
import { registerCompressTool } from "../_compress.js";
import { callTool, clearTools } from "../router/index.js";

clearTools();
registerCompressTool();

const call = (args) => callTool("rule_tool_compress", args);

test("a sensitive file name is refused before anything is compressed", async () => {
  for (const fileName of [".env", ".env.production", "credentials.md", "secrets.txt", "id_rsa", "~/.ssh/config", "docs/api-key.md", "cert.pem"]) {
    assert.equal(isSensitivePath(fileName), true, `${fileName} must read as sensitive`);

    const result = await call({ text: "The value is really just prose.", fileName });
    assert.equal(result.isError, true, `${fileName} must be refused`);
    assert.equal(result._meta.pixCompress.refused, "sensitive-file-name");
    assert.match(result.content[0].text, /REFUSED/);
  }
});

test("an ordinary file name compresses, and the saving is reported", async () => {
  const result = await call({ text: "The value is really just very large.", fileName: "docs/03-engineering-guides.md" });

  assert.notEqual(result.isError, true);
  assert.equal(isSensitivePath("docs/03-engineering-guides.md"), false);
  assert.ok(result._meta.pixCompress.saved >= 0);
  assert.equal(result._meta.pixCompress.guarded, true, "a clean pass reports a clean guard");
  assert.deepEqual(result._meta.pixCompress.violations, []);
});

test("every mode passes the guard on a text with structure to lose", async () => {
  const text = ["# The heading", "", "The router really just caches https://example.com/a in ./src/core/cache/index.js.", "", "```js", "const the = 1;", "```"].join("\n");

  for (const mode of ["both", "compression", "fingerprint"]) {
    const result = await call({ text, mode });
    assert.equal(result._meta.pixCompress.guarded, true, `${mode} must not break structure`);
    assert.match(result.content[0].text, /^# The heading/, `${mode} keeps the heading`);
    assert.match(result.content[0].text, /const the = 1;/, `${mode} keeps the code`);
    assert.match(result.content[0].text, /https:\/\/example\.com\/a/, `${mode} keeps the URL`);
  }
});

test("compress() is the pass, and the tool is the pass plus the guard", () => {
  assert.equal(compress("The value is really large.", "compression"), "value is large.");
  assert.equal(compress("Use the em dash - here.", "fingerprint"), "Use the em dash - here.");
});
