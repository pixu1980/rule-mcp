/** The rendered trio must come out Prettier-clean, with no format:fix step. */
import { strict as assert } from "node:assert";
import test from "node:test";
import * as prettier from "prettier";
import { FINDINGS, project, read, syncRoleDocs } from "./_trio.fixture.mjs";

test("the rendered trio is Prettier-clean", async () => {
  const dir = project();
  syncRoleDocs({ role: "security", findings: FINDINGS, projectDir: dir });

  for (const file of ["docs/audits/security.md", "docs/reviews/security.md", "docs/plans/security.md"]) {
    const text = read(dir, file);
    const formatted = await prettier.format(text, { parser: "markdown" });

    assert.equal(text, formatted, `${file} must come out Prettier-clean - the generator writes it padded`);
  }
});
