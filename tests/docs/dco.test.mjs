/** The commit-msg hook requires a DCO Signed-off-by trailer (OSS-10). */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const hook = join(root, ".githooks", "commit-msg");

function runs(msg) {
  const dir = mkdtempSync(join(tmpdir(), "rule-dco-"));
  const file = join(dir, "COMMIT_EDITMSG");

  writeFileSync(file, msg);

  try {
    execFileSync("sh", [hook, file], { stdio: "pipe" });

    return 0;
  } catch (error) {
    return error.status ?? 1;
  }
}

test("a commit body without Signed-off-by is rejected", () => {
  assert.notEqual(runs("fix(cache): drop a stale entry on read\n"), 0, "no trailer, no body - must fail");
  assert.notEqual(runs("fix(cache): drop a stale entry on read\n\nSome body without a trailer.\n"), 0, "body without a trailer - must fail");
});

test("a commit body with Signed-off-by is accepted", () => {
  assert.equal(runs("fix(cache): drop a stale entry on read\n\nSigned-off-by: Ada Lovelace <ada@example.com>\n"), 0, "trailer present - must pass");
});

test("merge and revert messages stay exempt", () => {
  assert.equal(runs("Merge branch 'feature/x' into main\n"), 0, "merges carry no scope and no trailer");
  assert.equal(runs('Revert "fix(cache): drop a stale entry"\n'), 0, "reverts carry no trailer");
});

test("CONTRIBUTING.md separates DCO provenance certification from inbound licensing (OSS-07)", () => {
  const contributing = readFileSync(join(root, "CONTRIBUTING.md"), "utf8");

  assert.ok(!contributing.includes("licensed under the DCO"), "CONTRIBUTING.md must not call the DCO a license");
  assert.match(contributing, /inbound\s*=\s*outbound/iu, "CONTRIBUTING.md must state inbound equals outbound licensing");
  assert.match(contributing, /provenance/iu, "CONTRIBUTING.md must state that the DCO certifies provenance");
});
