

/** Git reads for the handoff: safe exec, working-tree diff, recent log. */
import { existsSync } from "node:fs";
import { tryExec } from "../../shared/index.js";
import { join } from "node:path";

/**
 * Get git working tree diff (uncommitted changes).
 * Returns summary + list of changed files + full diff.
 */
export function getGitDiff(projectDir) {
  const gitDir = join(projectDir, ".git");

  if (!existsSync(gitDir)) {
    return { summary: "", files: [], diff: "" };
  }

  const summary = tryExec("git diff --stat", { cwd: projectDir }).trim();
  const staged = tryExec("git diff --cached --stat", { cwd: projectDir }).trim();
  const diff = tryExec("git diff", { cwd: projectDir }).trim();
  const stagedDiff = tryExec("git diff --cached", { cwd: projectDir }).trim();
  const untracked = tryExec("git status --porcelain", { cwd: projectDir }).trim();

  // Parse file list
  const statOutput = [summary, staged].filter(Boolean).join("\n");
  const files = statOutput
    .split("\n")
    .filter((l) => l.includes("|"))
    .map((l) => l.split("|", 1)[0].trim())
    .filter(Boolean);

  return {
    summary: statOutput || "(no uncommitted changes)",
    files: [...new Set(files)],
    untracked: untracked || "",
    unstaged: diff,
    staged: stagedDiff,
  };
}

/**
 * Get recent git log (last 20 commits, one-line format).
 */
export function getGitLog(projectDir) {
  const gitDir = join(projectDir, ".git");

  if (!existsSync(gitDir)) {
    return "";
  }

  const log = tryExec("git log --oneline --abbrev-commit --max-count=20 --pretty=format:'%h %s (%ar)'", {
    cwd: projectDir,
  }).trim();

  return log || "(no commits yet)";
}
