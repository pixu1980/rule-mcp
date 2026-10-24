/** Branch coverage for the remaining resource arms. */
import assert from "node:assert/strict";
import { test } from "node:test";

const { serveResource } = await import("../_read.js");

test("the a11y templates, community, project and summary arms answer", async () => {
  for (const uri of ["rule://a11y/test-basic", "rule://a11y/test-forms", "rule://community", "rule://project", "rule://rule-styleguide-css/summary"]) {
    const result = await serveResource(uri);

    assert.equal(result.contents.length, 1, uri);
    assert.equal(result.contents[0].uri, uri, uri);
  }

  assert.equal((await serveResource()).contents[0].text, "Resource not found");
});
