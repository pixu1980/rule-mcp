/** The naming predicates the whole file-tree engine is built on. */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { isBareComponent, isBarrelFile, isIgnored, isPrefixedComponent } from "../_conventions.js";

test("isIgnored covers the ignore list and every dotfile", () => {
  assert.equal(isIgnored("node_modules"), true, "vendored trees are ignored");
  assert.equal(isIgnored("coverage"), true, "generated reports are ignored");
  assert.equal(isIgnored(".git"), true, "a dot name is ignored even when listed");
  assert.equal(isIgnored(".anything"), true, "any dotfile is ignored");
  assert.equal(isIgnored("src"), false, "a normal folder is scanned");
});

test("isBarrelFile accepts the four barrel names and nothing else", () => {
  for (const name of ["index.js", "index.ts", "index.jsx", "index.tsx"]) {
    assert.equal(isBarrelFile(name), true, `${name} is a barrel`);
  }

  assert.equal(isBarrelFile("index.mjs"), false, "the engine does not treat index.mjs as a barrel");
  assert.equal(isBarrelFile("_Button.js"), false, "a component is not a barrel");
});

test("isPrefixedComponent wants an underscore, PascalCase and a lowercase extension", () => {
  assert.equal(isPrefixedComponent("_Button.js"), true);
  assert.equal(isPrefixedComponent("_ButtonGroup2.tsx"), true, "digits are allowed after the first letter");
  assert.equal(isPrefixedComponent("Button.js"), false, "no underscore");
  assert.equal(isPrefixedComponent("_button.js"), false, "not PascalCase");
  assert.equal(isPrefixedComponent("_Button.JS"), false, "the extension must be lowercase");
  assert.equal(isPrefixedComponent("_Button.test.js"), false, "a dotted name is not a plain component");
});

test("isBareComponent finds unprefixed components and lets utilities through", () => {
  assert.equal(isBareComponent("Button.jsx"), true, "PascalCase with no underscore is bare");
  assert.equal(isBareComponent("Button.vue"), true, "every component extension counts");

  assert.equal(isBareComponent("index.js"), false, "a barrel is never bare");
  assert.equal(isBareComponent("_Button.js"), false, "a prefixed component is not bare");
  assert.equal(isBareComponent("README.md"), false, "a non-component extension is not bare");
  assert.equal(isBareComponent("use-theme.js"), false, "a kebab-case utility is allowed at the folder root");
  assert.equal(isBareComponent("helpers.js"), false, "a lowercase utility is allowed");
  assert.equal(isBareComponent("useTheme.js"), false, "camelCase is a utility, not a component");
});
