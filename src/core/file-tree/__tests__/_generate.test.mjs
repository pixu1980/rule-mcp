

/** generateComponentFiles: one folder per framework, barrel plus component. */
import { strict as assert } from "node:assert";
import { join } from "node:path";
import { test } from "node:test";

import { generateComponentFiles } from "../_generate.js";

/** The generated file whose path ends with the given extension. */
const byExtension = (files, extension) => files.find((file) => file.path.endsWith(extension));

test("every framework yields a barrel and exactly one component file", () => {
  const expected = {
    react: ".jsx",
    solid: ".jsx",
    vue: ".vue",
    svelte: ".svelte",
    angular: ".ts",
    astro: ".astro",
    vanilla: ".js",
  };

  for (const [framework, extension] of Object.entries(expected)) {
    const files = generateComponentFiles({ name: "MyButton", framework });

    assert.equal(files.length, 2, `${framework}: a barrel and a component, nothing else`);
    assert.equal(files[0].path, join("src/components/MyButton", "index.js"), `${framework}: the barrel is index.js`);
    assert.ok(byExtension(files, extension), `${framework}: expected a ${extension} component, got ${files[1].path}`);
    assert.match(files[1].content, /MyButton/, `${framework}: the component carries the name`);
  }
});

test("an unknown framework falls back to the vanilla custom element", () => {
  const files = generateComponentFiles({ name: "MyButton", framework: "ember" });

  assert.ok(byExtension(files, ".js"), "the fallback writes a .js file");
  assert.match(files[1].content, /extends HTMLElement/, "the fallback is a custom element");
});

test("the framework defaults to vanilla and the base directory to src/components", () => {
  const files = generateComponentFiles({ name: "MyButton" });

  assert.equal(files[0].path, join("src/components/MyButton", "index.js"));
  assert.match(files[1].content, /customElements\.define/, "vanilla registers the element");
});

test("the custom element tag is the kebab-case name, so it is always valid", () => {
  const files = generateComponentFiles({ name: "MyButton" });
  assert.match(files[1].content, /customElements\.define\("my-button", MyButton\)/, "PascalCase becomes a hyphenated tag");

  const acronym = generateComponentFiles({ name: "HTMLBlock" });
  assert.match(acronym[1].content, /customElements\.define\("html-block", HTMLBlock\)/, "a leading acronym splits before the last capital");

  const angular = generateComponentFiles({ name: "MyButton", framework: "angular" });
  assert.match(angular[1].content, /selector: 'my-button'/, "angular uses the same tag");
});

test("baseDir places the folder where the caller asked", () => {
  const files = generateComponentFiles({ name: "MyButton", baseDir: "app/ui" });

  assert.equal(files[0].path, join("app/ui/MyButton", "index.js"));
  assert.equal(files[1].path, join("app/ui/MyButton", "_MyButton.js"));
});

test("the barrel re-exports the component it generated beside it", () => {
  const [barrel] = generateComponentFiles({ name: "MyButton" });

  assert.match(barrel.content, /export \{ MyButton \} from '\.\/_MyButton'/, "the barrel points at the sibling component");
  assert.match(barrel.content, /@module MyButton/, "the barrel documents the module");
});
