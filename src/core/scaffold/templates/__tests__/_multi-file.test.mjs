/**
 * generateMultiFile: one component folder per framework, and the arms that
 * refuse rather than emit a half-written tree.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { COMPONENT_TEMPLATES } from "../../_template-data.data.js";
import { generateMultiFile } from "../_multi-file.js";

/** The generated file whose path ends with the given suffix. */
const endingIn = (files, suffix) => files.find((file) => file.path.endsWith(suffix));

test("an unknown component is refused rather than guessed at", () => {
  assert.equal(generateMultiFile("not-a-component"), null, "no template means no files");
  assert.equal(generateMultiFile("not-a-component", "react"), null, "the framework does not rescue a missing template");
});

test("the vanilla default emits a custom element, its stylesheet and a barrel", () => {
  const files = generateMultiFile("button", "vanilla", "primary-button");

  assert.equal(files.length, 3, "component, stylesheet, barrel");
  const component = endingIn(files, "_PrimaryButton.js");
  assert.ok(component, `expected a _PrimaryButton.js: ${files.map((file) => file.path).join(", ")}`);
  assert.equal(component.language, "javascript");
  assert.match(component.content, /export class PrimaryButton extends HTMLElement/, "the name comes from the caller, not the template");
  assert.match(component.content, /customElements\.define\("primary-button", PrimaryButton\)/, "the tag is the kebab-case name");
  assert.match(component.content, new RegExp(COMPONENT_TEMPLATES.button.description), "the module header carries the description");

  assert.equal(endingIn(files, "_PrimaryButton.css").language, "css", "the stylesheet ships beside it");
  assert.match(endingIn(files, "index.js").content, /export \{ PrimaryButton \}/, "the barrel re-exports the class");
});

test("an unknown framework falls back to the vanilla arm", () => {
  const files = generateMultiFile("button", "ember", "primary-button");

  assert.ok(endingIn(files, "_PrimaryButton.js"), "the fallback writes the custom element");
});

test("the name defaults to the component key", () => {
  const files = generateMultiFile("button");

  assert.ok(endingIn(files, "_Button.js"), `expected _Button.js: ${files.map((file) => file.path).join(", ")}`);
  assert.ok(
    files.every((file) => file.path.startsWith("src/components/Button/")),
    "every file lands in the component folder",
  );
});

test("react and solid both emit jsx, and solid reuses the react source", () => {
  for (const framework of ["react", "solid"]) {
    const files = generateMultiFile("card", framework, "info-card");

    const component = endingIn(files, "_InfoCard.jsx");
    assert.ok(component, `${framework}: expected a jsx component`);
    assert.equal(component.language, "jsx");
    assert.match(component.content, /export function InfoCard/, `${framework}: the exported function is renamed to the requested name`);
    assert.match(endingIn(files, "index.js").content, /export \{ InfoCard \}/, `${framework}: the barrel re-exports it`);
  }
});

test("vue and svelte emit a single-file component plus a default-export barrel", () => {
  const vue = generateMultiFile("card", "vue", "info-card");
  assert.ok(endingIn(vue, "_InfoCard.vue"), "vue writes a .vue file");
  assert.equal(endingIn(vue, "_InfoCard.vue").language, "vue");
  assert.match(endingIn(vue, "index.js").content, /export \{ default as InfoCard \}/, "a vue component is a default export");

  const svelte = generateMultiFile("card", "svelte", "info-card");
  assert.ok(endingIn(svelte, "_InfoCard.svelte"), "svelte writes a .svelte file");
  assert.match(endingIn(svelte, "index.js").content, /export \{ default as InfoCard \}/, "so is a svelte one");
});

test("a template with no markup is refused on every framework arm", () => {
  // The a11y and playwright templates are whole files, not component markup:
  // there is nothing to wrap in a component, so the generator says so.
  for (const framework of ["react", "solid", "vue", "svelte"]) {
    assert.equal(generateMultiFile("a11y-test-basic", framework), null, `${framework}: no markup means no component tree`);
  }
});

test("a markup-less template still produces a vanilla tree, without a stylesheet", () => {
  const files = generateMultiFile("a11y-test-basic", "vanilla");

  assert.equal(files.length, 2, "component and barrel, no stylesheet to write");
  assert.ok(endingIn(files, "index.js"), "the barrel is always written");
  assert.equal(endingIn(files, ".css"), undefined, "nothing is invented to style");
});
