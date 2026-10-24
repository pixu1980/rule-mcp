/**
 * The injectable resolution context: where editor data lives per platform, and
 * the gates that decide whether a candidate directory is a target.
 *
 * Every helper takes its filesystem and platform as arguments, so all three
 * platform arms are reachable from one process.
 */
import { strict as assert } from "node:assert";
import { join } from "node:path";
import { test } from "node:test";

import { defaultContext, editorDataRoot, firstExisting, ifParentExists, VSCODE_VARIANTS, vscodePromptDirs } from "../_context.js";

/** A context whose filesystem is the set of paths passed in. */
const context = (present = [], extra = {}) => ({
  home: "/home/probe",
  cwd: "/work",
  platform: "linux",
  env: {},
  exists: (path) => present.includes(path),
  listDir: () => [],
  ...extra,
});

test("each platform puts editor data where that platform puts it", () => {
  assert.equal(editorDataRoot({ home: "/h", platform: "darwin", env: {} }), join("/h", "Library", "Application Support"));
  assert.equal(editorDataRoot({ home: "/h", platform: "linux", env: {} }), join("/h", ".config"));
  assert.equal(editorDataRoot({ home: "/h", platform: "win32", env: { APPDATA: String.raw`C:\Roaming` } }), String.raw`C:\Roaming`, "windows honors APPDATA");
  assert.equal(editorDataRoot({ home: "/h", platform: "win32", env: {} }), join("/h", "AppData", "Roaming"), "and falls back when it is unset");
});

test("the stable VS Code channel is always a target, the other variants only when installed", () => {
  const root = join("/home/probe", ".config");
  const dirs = vscodePromptDirs(context([]));

  assert.deepEqual(dirs, [join(root, "Code", "User", "prompts")], "a machine with no VS Code still targets the stable channel");

  const insiders = join(root, "Code - Insiders", "User");
  const withInsiders = vscodePromptDirs(context([insiders]));

  assert.deepEqual(withInsiders, [join(root, "Code", "User", "prompts"), join(insiders, "prompts")], "an installed variant is added");
});

test("every profile of an installed variant gets its own prompt directory", () => {
  const root = join("/home/probe", ".config");
  const dirs = vscodePromptDirs(context([], { listDir: (path) => (path.endsWith(join("Code", "User", "profiles")) ? ["work", "personal"] : []) }));

  assert.deepEqual(dirs, [
    join(root, "Code", "User", "prompts"),
    join(root, "Code", "User", "profiles", "work", "prompts"),
    join(root, "Code", "User", "profiles", "personal", "prompts"),
  ]);
});

test("firstExisting picks the first candidate that is there", () => {
  const candidates = [
    { gate: "/a", dir: "/a/commands" },
    { gate: "/b", dir: "/b/commands" },
  ];

  assert.deepEqual(firstExisting(context(["/b"]), candidates), ["/b/commands"], "the one that exists wins");
  assert.deepEqual(firstExisting(context(["/a", "/b"]), candidates), ["/a/commands"], "the earlier candidate wins a tie");
  assert.deepEqual(firstExisting(context([]), candidates), [], "nothing existing means no target");
  assert.deepEqual(firstExisting(context([], { force: true }), candidates), ["/a/commands"], "an explicit install falls back to the first candidate");
});

test("ifParentExists gates a directory on its parent, unless the install is explicit", () => {
  assert.deepEqual(ifParentExists(context(["/p"]), "/p", "/p/commands"), ["/p/commands"]);
  assert.deepEqual(ifParentExists(context([]), "/p", "/p/commands"), [], "no parent means no target");
  assert.deepEqual(ifParentExists(context([], { force: true }), "/p", "/p/commands"), ["/p/commands"], "an explicit install creates it anyway");
});

test("the default context reads the real machine and survives a missing directory", () => {
  const ctx = defaultContext();

  assert.equal(ctx.platform, process.platform, "it reports this platform");
  assert.equal(ctx.cwd, process.cwd());
  assert.equal(ctx.exists("/definitely/not/here"), false);
  assert.deepEqual(ctx.listDir("/definitely/not/here"), [], "an unreadable directory lists as empty, not as a throw");
  assert.ok(Array.isArray(ctx.listDir(process.cwd())), "and a real one lists its subdirectories");
});

test("the variant list is stable-first", () => {
  assert.equal(VSCODE_VARIANTS[0], "Code", "the stable channel leads, which is what the gate above relies on");
});
