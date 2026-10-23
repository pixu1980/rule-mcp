import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * The published tarball must install under any npm-family client.
 *
 * `package.json` once declared a runtime dependency on itself through the
 * pnpm-only `link:` protocol, so `npm install ./rule-mcp-*.tgz`
 * aborted with EUNSUPPORTEDPROTOCOL before unpacking (OSS-5). A public
 * package (anything without `"private": true`) may not reference
 * `link:`, `file:` or `workspace:` in any dependency table: those
 * protocols only resolve inside the author's own checkout or package
 * manager.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOCAL_PROTOCOL = /^(?:link|file|workspace):/u;

function localRefs(manifest) {
  const hits = [];

  for (const table of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, range] of Object.entries(manifest[table] ?? {})) {
      if (typeof range === "string" && LOCAL_PROTOCOL.test(range)) {
        hits.push(`${table}.${name}: ${range}`);
      }
    }
  }

  return hits;
}

test("a public manifest has no link:, file: or workspace: dependencies", () => {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

  if (manifest.private === true) {
    return;
  }

  assert.deepEqual(localRefs(manifest), [], "local protocols only resolve in the author's checkout - the packed tarball cannot install under npm");
});
