

/**
 * generateMultiFile: the file tree each framework gets, and when it gets none.
 *
 * The generator had two of twelve branches covered: the scaffold tool was
 * exercised, the tree it emits was not. Every arm here is a real question -
 * which files land, what the barrel re-exports, and which combinations have no
 * answer at all and must say so instead of emitting half a component.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { COMPONENT_TEMPLATES } from "../../_template-data.data.js";
import { generateMultiFile } from "../_multi-file.js";

const paths = (files) => files.map((file) => file.path);
const byPath = (files, suffix) => files.find((file) => file.path.endsWith(suffix));

test("an unknown component has no tree", () => {
  assert.equal(generateMultiFile("does-not-exist", "react"), null);
});

test("react gets a component, its stylesheet and a barrel", () => {
  const files = generateMultiFile("button", "react");

  assert.deepEqual(paths(files), ["src/components/Button/_Button.jsx", "src/components/Button/_Button.css", "src/components/Button/index.js"]);
  assert.match(byPath(files, "index.js").content, /export \{ Button \} from '\.\/_Button\.jsx'/);
  assert.equal(byPath(files, ".jsx").language, "jsx");
  assert.equal(byPath(files, ".css").language, "css");
});

test("solid has no template of its own and falls back to the react source", () => {
  assert.equal(COMPONENT_TEMPLATES.button.solid, undefined, "the fixture this leans on");

  const solid = generateMultiFile("button", "solid");
  const react = generateMultiFile("button", "react");

  assert.deepEqual(paths(solid), paths(react));
  assert.equal(byPath(solid, ".jsx").content, byPath(react, ".jsx").content, "same source, different framework key");
});

test("a custom name renames the exported component, not just the file", () => {
  const files = generateMultiFile("button", "react", "SubmitControl");

  assert.deepEqual(paths(files), ["src/components/SubmitControl/_SubmitControl.jsx", "src/components/SubmitControl/_SubmitControl.css", "src/components/SubmitControl/index.js"]);
  assert.match(byPath(files, ".jsx").content, /export function SubmitControl/, "the export follows the name");
  assert.doesNotMatch(byPath(files, ".jsx").content, /export function Button\b/, "and the template's own name is gone");
});

test("vue gets a single-file component and a default-export barrel", () => {
  const files = generateMultiFile("card", "vue");

  assert.deepEqual(paths(files), ["src/components/Card/_Card.vue", "src/components/Card/index.js"]);
  assert.equal(byPath(files, ".vue").language, "vue");
  assert.match(byPath(files, "index.js").content, /export \{ default as Card \} from '\.\/_Card\.vue'/);
});

test("svelte gets a single-file component and a default-export barrel", () => {
  const files = generateMultiFile("card", "svelte");

  assert.deepEqual(paths(files), ["src/components/Card/_Card.svelte", "src/components/Card/index.js"]);
  assert.equal(byPath(files, ".svelte").language, "svelte");
  assert.match(byPath(files, "index.js").content, /export \{ default as Card \} from '\.\/_Card\.svelte'/);
});

test("an unknown framework falls through to a custom element", () => {
  const files = generateMultiFile("modal", "no-such-framework");

  assert.deepEqual(paths(files), ["src/components/Modal/_Modal.js", "src/components/Modal/_Modal.css", "src/components/Modal/index.js"]);

  const element = byPath(files, "_Modal.js").content;
  assert.match(element, /export class Modal extends HTMLElement/, "a custom element, not a framework component");
  assert.match(element, /customElements\.define\("modal", Modal\)/, "registered under its kebab name");
  assert.match(element, /template\.content\.cloneNode\(true\)/, "cloned from a template element");
});

test("a template with no markup has no tree in any framework", () => {
  // playwright-config is a file template, not a component: its `vanilla` is the
  // file's own text, not `{ html, css }`. Reading that as a component emitted a
  // custom element wrapping an empty template - the defect this pins shut.
  assert.equal(typeof COMPONENT_TEMPLATES["playwright-config"].vanilla, "string", "the fixture this leans on");

  for (const framework of ["react", "solid", "vue", "svelte", "vanilla"]) {
    assert.equal(generateMultiFile("playwright-config", framework), null, `${framework} must refuse rather than emit half a component`);
  }
});

test("the default framework is vanilla", () => {
  assert.deepEqual(paths(generateMultiFile("list")), paths(generateMultiFile("list", "vanilla")));
});
