// test/apply-containment.test.mjs
//
// Audit findings 01 + 02 — pix_apply is the only tool that writes files, so
// its containment check carries all the security weight.
//
//   01. The containment root came from the caller's own `path` argument, so
//       `path: "/"` made every target "inside the project". The guard could not
//       fail when the caller picked the root. Containment was also pure string
//       math (path.resolve), so a symlinked directory inside a real project
//       escaped it.
//   02. Sensitive destinations (.git/hooks/*, shell rc files, ~/.ssh) are code
//       execution vectors: content that passes every guardrail is still hostile
//       when written there. Destination has to be checked, not just content.
//
// These tests pin the primitives, not the tool wiring: resolveProjectRoot()
// rejects roots that are not projects, resolveWriteTarget() rejects escapes and
// sensitive destinations, canonicalFilesDigest() is unambiguous across shapes.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, symlinkSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, parse, sep } from "node:path";

import { resolveProjectRoot, resolveWriteTarget, canonicalFilesDigest } from "../src/tools/apply.js";

/** A realpath'd temp project root (macOS /tmp is a symlink to /private/tmp). */
const project = realpathSync(mkdtempSync(join(tmpdir(), "rule-apply-")));

// ── resolveProjectRoot: the root itself must be plausible ──────────────────

test("resolveProjectRoot accepts an ordinary directory", () => {
  assert.equal(resolveProjectRoot(project), project);
});

test("resolveProjectRoot rejects the filesystem root", () => {
  const fsRoot = parse(process.cwd()).root;
  assert.throws(() => resolveProjectRoot(fsRoot), /root/i);
});

test("resolveProjectRoot rejects the user home directory", () => {
  assert.throws(() => resolveProjectRoot(homedir()), /home/i);
});

test("resolveProjectRoot rejects system directories", { skip: process.platform === "win32" }, () => {
  for (const dir of ["/etc", "/usr", "/var", "/etc/cron.d"]) {
    assert.throws(() => resolveProjectRoot(dir), /system/i, `${dir} must be refused`);
  }
});

// ── resolveWriteTarget: destination containment ────────────────────────────

test("resolveWriteTarget accepts a relative path inside the root", () => {
  assert.equal(resolveWriteTarget(project, "src/app.js"), join(project, "src", "app.js"));
});

test("resolveWriteTarget rejects an absolute target path", () => {
  assert.throws(() => resolveWriteTarget(project, "/etc/cron.d/pwn"), /absolute/i);
});

test("resolveWriteTarget rejects .. traversal", () => {
  assert.throws(() => resolveWriteTarget(project, "../outside.js"), /traversal|escape/i);
  assert.throws(() => resolveWriteTarget(project, "src/../../outside.js"), /traversal|escape/i);
});

test("resolveWriteTarget rejects an empty target", () => {
  assert.throws(() => resolveWriteTarget(project, ""), /path/i);
});

test("resolveWriteTarget follows symlinks before deciding", { skip: process.platform === "win32" }, () => {
  const escapeTarget = realpathSync(mkdtempSync(join(tmpdir(), "rule-escape-")));
  const link = join(project, "vendor");
  symlinkSync(escapeTarget, link, "dir");
  // Pure string math says "vendor/x.js is inside the project"; realpath says
  // otherwise. The realpath answer is the one that matters.
  assert.throws(() => resolveWriteTarget(project, "vendor/x.js"), /symlink|escape/i);
});

test("resolveWriteTarget rejects .git destinations (hook = code execution)", () => {
  mkdirSync(join(project, ".git", "hooks"), { recursive: true });
  assert.throws(() => resolveWriteTarget(project, ".git/hooks/pre-commit"), /protected|sensitive/i);
  assert.throws(() => resolveWriteTarget(project, ".git/config"), /protected|sensitive/i);
});

test("resolveWriteTarget rejects shell rc files and key material", () => {
  for (const bad of [".zshrc", ".bashrc", ".profile", ".ssh/authorized_keys", ".gnupg/x"]) {
    assert.throws(() => resolveWriteTarget(project, bad), /protected|sensitive/i, `${bad} must be refused`);
  }
});

test("resolveWriteTarget rejects agent instruction directories", () => {
  for (const bad of [".claude/settings.json", ".agents/skills/x/plugin.js"]) {
    assert.throws(() => resolveWriteTarget(project, bad), /protected|sensitive/i, `${bad} must be refused`);
  }
});

test("resolveWriteTarget still allows ordinary project config", () => {
  for (const good of [".npmrc", ".nvmrc", ".prettierrc", "package.json", ".vscode/settings.json"]) {
    assert.equal(resolveWriteTarget(project, good), join(project, ...good.split("/")));
  }
});

test("resolveWriteTarget rejects NUL bytes in the path", () => {
  assert.throws(() => resolveWriteTarget(project, "src/a\0.js"), /NUL|invalid/i);
});

// ── canonicalFilesDigest: no in-band separator ambiguity ───────────────────

test("canonicalFilesDigest binds paths, not just contents", () => {
  const a = canonicalFilesDigest([{ path: "a.js", content: "X" }]);
  const b = canonicalFilesDigest([{ path: "b.js", content: "X" }]);
  assert.notEqual(a, b, "same content at a different path must not share a digest");
});

test("canonicalFilesDigest is stable for identical input", () => {
  const files = [{ path: "a.js", content: "X" }, { path: "b.js", content: "Y" }];
  assert.equal(canonicalFilesDigest(files), canonicalFilesDigest(structuredClone(files)));
});

test("canonicalFilesDigest resists the ---FILE--- separator collision", () => {
  // The old digest joined contents with "\n---FILE---\n", so these two shapes
  // hashed identically and one receipt validated both.
  const twoFiles = canonicalFilesDigest([{ path: "a.js", content: "X" }, { path: "b.js", content: "Y" }]);
  const oneFile = canonicalFilesDigest([{ path: "a.js", content: "X\n---FILE---\nY" }]);
  assert.notEqual(twoFiles, oneFile);
});

test("canonicalFilesDigest is order-sensitive", () => {
  const ab = canonicalFilesDigest([{ path: "a.js", content: "X" }, { path: "b.js", content: "Y" }]);
  const ba = canonicalFilesDigest([{ path: "b.js", content: "Y" }, { path: "a.js", content: "X" }]);
  assert.notEqual(ab, ba);
});

// ── the guard holds for a root that looks legitimate ───────────────────────

test("a legitimate write inside a project root resolves and can be written", () => {
  writeFileSync(join(project, "package.json"), "{}");
  const resolved = resolveWriteTarget(resolveProjectRoot(project), "src/index.js");
  assert.ok(resolved.startsWith(project + sep));
});
