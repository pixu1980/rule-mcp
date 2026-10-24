

/** WS3 - the commit-lint gate's three inputs. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { commitLintCommand } from "../_commit.js";
import { headSha } from "../../../core/git/index.js";
import { commit, makeRepo, remove } from "../../../core/git/__tests__/_fixture.mjs";

/** Collect what the command wrote, so a verdict can be asserted without a spawn. */
function capture() {
  const out = [];
  const errors = [];

  return {
    out,
    errors,
    io: { write: (text) => out.push(text), writeError: (text) => errors.push(text) },
  };
}

/** Write a message file under a throwaway directory. */
function messageFile(text) {
  const dir = mkdtempSync(join(tmpdir(), "rule-mcp-commit-msg-"));
  const path = join(dir, "COMMIT_EDITMSG");
  writeFileSync(path, text);

  return { path, dir };
}

test("a conforming message file passes", () => {
  const { path, dir } = messageFile("feat(auth): add OAuth authentication\n\nSigned-off-by: x <x@y.z>\n");
  const { out, errors, io } = capture();

  const code = commitLintCommand({ msgFile: path }, io);

  assert.equal(code, 0, "the commit is allowed");
  assert.equal(errors.length, 0, "nothing is reported as an error");
  assert.match(out.join(""), /follows type\(scope\)/u, "the verdict is stated");
  rmSync(dir, { recursive: true, force: true });
});

test("a scope-less message file is rejected with the format", () => {
  const { path, dir } = messageFile("docs: port documentation\n");
  const { errors, io } = capture();

  const code = commitLintCommand({ msgFile: path }, io);
  const text = errors.join("");

  assert.equal(code, 1, "the commit is blocked");
  assert.match(text, /rejected/u, "the rejection is stated");
  assert.match(text, /missing scope/u, "the reason is named");
  assert.match(text, /type\(scope\): subject/u, "the correct format is shown");
  rmSync(dir, { recursive: true, force: true });
});

test("a system-generated message file is exempt", () => {
  const { path, dir } = messageFile("Merge branch 'main' into 'feature'\n");
  const { out, io } = capture();

  assert.equal(commitLintCommand({ msgFile: path }, io), 0, "a merge is allowed");
  assert.match(out.join(""), /exempt/u, "and reported as exempt");
  rmSync(dir, { recursive: true, force: true });
});

test("a range with one bad commit is blocked", () => {
  const root = makeRepo();
  const base = headSha(root);

  commit(root, "a.txt", "a\n", "feat(a): good");
  commit(root, "b.txt", "b\n", "no type here");

  const { errors, io } = capture();
  const code = commitLintCommand({ projectDir: root, range: `${base}..HEAD` }, io);

  assert.equal(code, 1, "the gate blocks");
  assert.match(errors.join(""), /no type here/u, "the offending subject is shown");
  remove(root);
});

test("a base and head compose the range, and a deletes-only push passes", () => {
  const root = makeRepo();
  const base = headSha(root);

  commit(root, "a.txt", "a\n", "feat(a): good");

  const { io } = capture();

  assert.equal(commitLintCommand({ projectDir: root, base, head: "HEAD" }, io), 0, "--base..--head validates clean");

  const zero = "0".repeat(40);
  const stdin = `(delete) ${zero} refs/heads/gone ${headSha(root)}\n`;

  assert.equal(commitLintCommand({ projectDir: root, stdinPush: true }, { ...io, stdin }), 0, "a deletion has nothing to lint");
  remove(root);
});

test("no input mode is an error, not a silent pass", () => {
  const { errors, io } = capture();

  assert.equal(commitLintCommand({}, io), 1, "the gate refuses to guess");
  assert.match(errors.join(""), /--msg-file/u, "the usage names the options");
});
