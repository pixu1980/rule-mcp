/**
 * The containment rule the hook installer enforces, with the platform as an
 * argument.
 *
 * It is a function rather than a `startsWith` in the installer because the two
 * paths arrive in different shapes on Windows - git says `D:/repo/.git`, and
 * `path.join` says `D:\repo\.git\hooks`. Nothing about that mismatch is
 * visible from a POSIX test, so the rule is testable here and the platform is
 * injected: a regression fails on Linux CI instead of on someone's laptop.
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";

import { isInsideGitDir } from "../_containment.mjs";

test("a Windows clone accepts the hooks directory, whatever the slashes", () => {
  assert.equal(isInsideGitDir("D:/a/repo/.git", String.raw`D:\a\repo\.git\hooks`, "win32"), true, "git reports forward slashes, path.join answers backslashes");
  assert.equal(isInsideGitDir(String.raw`D:\a\repo\.git`, "D:/a/repo/.git/hooks", "win32"), true, "and the reverse order is the same directory");
});

test("Windows paths are compared the way the filesystem compares them", () => {
  assert.equal(isInsideGitDir("D:/A/repo/.git", String.raw`d:\a\repo\.git\hooks`, "win32"), true, "a drive letter is not case sensitive");
});

test("the git directory itself is not outside itself", () => {
  assert.equal(isInsideGitDir("/repo/.git", "/repo/.git"), true);
  assert.equal(isInsideGitDir("D:/repo/.git", String.raw`D:\repo\.git`, "win32"), true);
});

test("a sibling that shares the prefix is outside", () => {
  assert.equal(isInsideGitDir("/repo/.git", "/repo/.git-evil/hooks"), false, "a string prefix is not containment");
  assert.equal(isInsideGitDir("D:/repo/.git", String.raw`D:\repo\.git-evil\hooks`, "win32"), false);
});

test("an unrelated directory is outside", () => {
  assert.equal(isInsideGitDir("/repo/.git", "/tmp/hooks"), false);
  assert.equal(isInsideGitDir("D:/repo/.git", String.raw`C:\elsewhere\hooks`, "win32"), false);
  assert.equal(isInsideGitDir("/repo/.git", "/repo/hooks"), false, "the worktree is not the git directory");
});

test("a POSIX clone accepts its own hooks directory", () => {
  assert.equal(isInsideGitDir("/repo/.git", "/repo/.git/hooks"), true);
});
