/** A Windows checkout with CRLF endings loads the whole persona catalog. */
import { strict as assert } from "node:assert";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { loadPersonaCatalog } from "../index.js";

const PERSONA_DIR = fileURLToPath(new URL("../../../../../personas", import.meta.url));

test("a Windows checkout with CRLF endings loads the whole catalog", () => {
  // windows-latest checks out text as CRLF (no .gitattributes pins LF), and
  // the smoke test failed there with an empty embedded catalog: every file
  // was rejected because \r leaked into the parsed values.
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-personas-crlf-"));
  const shipped = readdirSync(PERSONA_DIR).filter((entry) => entry.endsWith(".md"));

  try {
    for (const name of shipped) {
      const lf = readFileSync(join(PERSONA_DIR, name), "utf8");
      writeFileSync(join(dir, name), lf.replaceAll("\n", "\r\n"));
    }

    const { roles, problems } = loadPersonaCatalog(dir);

    assert.deepEqual(problems, [], "no CRLF file is rejected");
    assert.equal(roles.length, shipped.length, "the whole catalog loads under CRLF");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
