

/**
 * Where the command installer decides to write, on each platform.
 *
 * The module exists to make that decision injectable - every function here
 * takes a context rather than reading the real filesystem - and the injection
 * was never used: the darwin arm ran because the developer was on darwin, and
 * the Windows and Linux arms ran nowhere. A fake context costs nothing and
 * answers all three.
 */
import { strict as assert } from "node:assert";
import { join } from "node:path";
import { test } from "node:test";

import { defaultContext, editorDataRoot, firstExisting, ifParentExists, VSCODE_VARIANTS, vscodePromptDirs } from "../_context.js";

/** A context that answers from a set of paths instead of a disk. */
const fake = ({ platform = "linux", home = "/home/dev", present = [], dirs = {}, env = {}, force = false } = {}) => ({
  home,
  cwd: "/work",
  platform,
  env,
  force,
  exists: (path) => present.includes(path),
  listDir: (path) => dirs[path] ?? [],
});

test("each platform keeps its editor data where that platform keeps it", () => {
  assert.equal(editorDataRoot(fake({ platform: "darwin", home: "/Users/dev" })), "/Users/dev/Library/Application Support");
  assert.equal(editorDataRoot(fake({ platform: "linux" })), "/home/dev/.config");
  assert.equal(
    editorDataRoot(fake({ platform: "win32", home: String.raw`C:\Users\dev`, env: { APPDATA: String.raw`C:\Users\dev\AppData\Roaming` } })),
    String.raw`C:\Users\dev\AppData\Roaming`,
  );
});

test("Windows without APPDATA falls back to the conventional location", () => {
  const root = editorDataRoot(fake({ platform: "win32", home: String.raw`C:\Users\dev`, env: {} }));

  assert.equal(root, join(String.raw`C:\Users\dev`, "AppData", "Roaming"), "an unset APPDATA is not a reason to give up");
});

test("the stable channel is always targeted, the other variants only when installed", () => {
  const root = "/home/dev/.config";
  const insidersUser = join(root, "Code - Insiders", "User");
  const dirs = vscodePromptDirs(fake({ present: [insidersUser] }));

  assert.ok(dirs.includes(join(root, "Code", "User", "prompts")), "stable is the default install");
  assert.ok(dirs.includes(join(insidersUser, "prompts")), "insiders exists, so it is targeted");

  const notInstalled = VSCODE_VARIANTS.slice(1).filter((name) => name !== "Code - Insiders");

  for (const variant of notInstalled) {
    assert.ok(
      dirs.every((dir) => !dir.includes(variant)),
      `${variant} is not installed and must not be written to`,
    );
  }
});

test("every profile of an installed variant gets its own prompt directory", () => {
  const root = "/home/dev/.config";
  const stableUser = join(root, "Code", "User");
  const dirs = vscodePromptDirs(fake({ dirs: { [join(stableUser, "profiles")]: ["work", "oss"] } }));

  assert.deepEqual(dirs, [join(stableUser, "prompts"), join(stableUser, "profiles", "work", "prompts"), join(stableUser, "profiles", "oss", "prompts")]);
});

test("firstExisting picks the first gate that is there, and force picks anyway", () => {
  const candidates = [
    { gate: "/a/gate", dir: "/a/dir" },
    { gate: "/b/gate", dir: "/b/dir" },
  ];

  assert.deepEqual(firstExisting(fake({ present: ["/b/gate"] }), candidates), ["/b/dir"], "the one that exists");
  assert.deepEqual(firstExisting(fake({}), candidates), [], "nothing there means nothing written");
  assert.deepEqual(firstExisting(fake({ force: true }), candidates), ["/a/dir"], "an explicit install gets the first candidate");
});

test("ifParentExists writes only under a parent that is there, unless forced", () => {
  assert.deepEqual(ifParentExists(fake({ present: ["/parent"] }), "/parent", "/parent/child"), ["/parent/child"]);
  assert.deepEqual(ifParentExists(fake({}), "/parent", "/parent/child"), []);
  assert.deepEqual(ifParentExists(fake({ force: true }), "/parent", "/parent/child"), ["/parent/child"]);
});

test("the default context reads the real machine, and an unreadable directory is empty", () => {
  const context = defaultContext();

  assert.equal(context.platform, process.platform);
  assert.equal(context.home.length > 0, true);
  assert.equal(context.exists("/definitely/not/here"), false);
  assert.deepEqual(context.listDir("/definitely/not/here"), [], "a directory that cannot be read lists nothing");
});
