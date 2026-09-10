

// canonicalFilesDigest: no in-band separator ambiguity - the receipt binds exactly one shape.
import test from "node:test";
import assert from "node:assert/strict";

import { canonicalFilesDigest } from "../index.js";

test("canonicalFilesDigest binds paths, not just contents", () => {
  const a = canonicalFilesDigest([{ path: "a.js", content: "X" }]);
  const b = canonicalFilesDigest([{ path: "b.js", content: "X" }]);
  assert.notEqual(a, b, "same content at a different path must not share a digest");
});

test("canonicalFilesDigest is stable for identical input", () => {
  const files = [
    { path: "a.js", content: "X" },
    { path: "b.js", content: "Y" },
  ];
  assert.equal(canonicalFilesDigest(files), canonicalFilesDigest(structuredClone(files)));
});

test("canonicalFilesDigest resists the ---FILE--- separator collision", () => {
  // The old digest joined contents with "\n---FILE---\n", so these two shapes
  // hashed identically and one receipt validated both.
  const twoFiles = canonicalFilesDigest([
    { path: "a.js", content: "X" },
    { path: "b.js", content: "Y" },
  ]);
  const oneFile = canonicalFilesDigest([{ path: "a.js", content: "X\n---FILE---\nY" }]);
  assert.notEqual(twoFiles, oneFile);
});

test("canonicalFilesDigest is order-sensitive", () => {
  const ab = canonicalFilesDigest([
    { path: "a.js", content: "X" },
    { path: "b.js", content: "Y" },
  ]);
  const ba = canonicalFilesDigest([
    { path: "b.js", content: "Y" },
    { path: "a.js", content: "X" },
  ]);
  assert.notEqual(ab, ba);
});
