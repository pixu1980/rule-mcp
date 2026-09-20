

/**
 * stripForbiddenManifestFields: the repair the guardrail cannot perform.
 *
 * The rule says the fields must not be there; the write path says what happens
 * when a model writes them anyway. The strip is surgical - it parses the
 * manifest, deletes the three fields, and re-serialises with the indentation
 * the file already used - so everything around them survives byte for byte.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { stripForbiddenManifestFields, stripManifestFiles } from "../_manifest-strip.js";

const FORBIDDEN = {
  packageManager: "pnpm@11.25.0",
  engines: { node: ">=22" },
  devEngines: { packageManager: { name: "pnpm", version: "11.8.0" }, runtime: { name: "node", version: "24.0.0" } },
};

test("a manifest sheds packageManager, engines and devEngines.packageManager", () => {
  const code = `${JSON.stringify({ name: "app", version: "1.0.0", ...FORBIDDEN, dependencies: { zod: "4.6.5" } }, null, 2)}\n`;
  const { code: clean, removed } = stripForbiddenManifestFields(code, "package.json");

  assert.deepEqual(removed, ["packageManager", "engines", "devEngines.packageManager"]);

  const parsed = JSON.parse(clean);

  assert.equal(parsed.packageManager, undefined, "packageManager is gone");
  assert.equal(parsed.engines, undefined, "engines is gone");
  assert.deepEqual(parsed.devEngines, { runtime: { name: "node", version: "24.0.0" } }, "devEngines keeps its other members");
  assert.equal(parsed.name, "app", "the rest of the manifest is untouched");
  assert.equal(parsed.dependencies.zod, "4.6.5", "dependency groups survive");
  assert.ok(clean.endsWith("\n"), "the trailing newline survives");
});

test("devEngines is dropped entirely when packageManager was its only member", () => {
  const code = `${JSON.stringify({ name: "app", devEngines: { packageManager: { name: "pnpm" } } }, null, 2)}\n`;
  const { code: clean } = stripForbiddenManifestFields(code, "package.json");

  assert.equal(Object.hasOwn(JSON.parse(clean), "devEngines"), false, "an emptied devEngines does not linger");
});

test("a manifest without the fields is returned byte for byte", () => {
  const code = '{\n  "name": "app"\n}\n';

  assert.deepEqual(stripForbiddenManifestFields(code, "package.json"), { code, removed: [] });
});

test("a file that is not a manifest is never touched", () => {
  const code = JSON.stringify({ engines: { node: ">=22" } }, null, 2);

  assert.deepEqual(stripForbiddenManifestFields(code, "src/config.json"), { code, removed: [] }, "the path decides, not the content");
});

test("unparseable JSON is left alone for the guardrail to report", () => {
  const code = '{ "engines": ';

  assert.deepEqual(stripForbiddenManifestFields(code, "package.json"), { code, removed: [] });
});

test("a tab-indented manifest stays tab-indented", () => {
  const code = '{\n\t"name": "app",\n\t"engines": {\n\t\t"node": ">=22"\n\t}\n}\n';
  const { code: clean } = stripForbiddenManifestFields(code, "package.json");

  assert.match(clean, /^\{\n\t"name": "app"\n\}$/m, "the indentation is the one the file used");
});

test("stripManifestFiles names every file it cleaned", () => {
  const files = [
    { path: "package.json", content: '{ "engines": { "node": ">=22" } }' },
    { path: "apps/web/package.json", content: '{ "packageManager": "pnpm@11.25.0" }' },
    { path: "src/app.js", content: "export const engines = 1;" },
  ];
  const { files: clean, removed } = stripManifestFiles(files);

  assert.deepEqual(removed, [
    { path: "package.json", fields: ["engines"] },
    { path: "apps/web/package.json", fields: ["packageManager"] },
  ]);
  assert.equal(clean[2].content, files[2].content, "the source file is untouched");
  assert.equal(JSON.parse(clean[0].content).engines, undefined);
});
