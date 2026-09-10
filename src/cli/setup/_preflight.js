/**
 * @module cli/setup/preflight
 *
 * What the wizard checks before it offers to change anything: the runtime,
 * the package manager, git, and which binary the agent configs should point
 * at.
 *
 * Read-only. Nothing here writes; the plan does the writing.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { tryExec } from "../../shared/index.js";
import { getRepoRoot } from "../paths/index.js";
import { shimPath, shimWorks } from "./_shim.js";

/** Lowest Node this server runs on; mirrors the `engines` field. */
export const NODE_MIN = 20;

const major = (version) => Number.parseInt(String(version).replace(/^v/, "").split(".", 1)[0], 10);

/** Whether the repo we are running from is this project's own checkout. */
export function detectLocalRepo(root = process.cwd()) {
  const manifest = join(root, "package.json");

  if (!existsSync(manifest)) {
    return false;
  }

  try {
    return JSON.parse(readFileSync(manifest, "utf8")).name === "rule-mcp";
  } catch {
    return false;
  }
}

/** pnpm when it is there, npm otherwise, "" when neither is. */
export function detectPackageManager() {
  if (tryExec("pnpm --version").trim()) {
    return "pnpm";
  }

  return tryExec("npm --version").trim() ? "npm" : "";
}

/**
 * Collect every preflight fact in one pass.
 *
 * @returns {{ checks: Array<{ id: string, label: string, status: "ok"|"warn"|"fail", detail: string }>, context: object }}
 */
export function preflight() {
  const nodeVersion = process.version;
  const packageManager = detectPackageManager();
  const gitVersion = tryExec("git --version").trim();
  const isLocalRepo = detectLocalRepo();
  const localBin = join(isLocalRepo ? process.cwd() : getRepoRoot(), "bin", "rule-mcp.js");
  const hasLocalBin = existsSync(localBin);
  const shim = shimPath();
  const shimOk = shimWorks();

  const checks = [
    {
      id: "node",
      label: "Node.js",
      status: major(nodeVersion) >= NODE_MIN ? "ok" : "fail",
      detail: major(nodeVersion) >= NODE_MIN ? nodeVersion : `${nodeVersion} - version ${NODE_MIN} or newer is required`,
    },
    {
      id: "package-manager",
      label: "Package manager",
      status: packageManager ? "ok" : "fail",
      detail: packageManager || "neither pnpm nor npm is on PATH",
    },
    { id: "git", label: "git", status: gitVersion ? "ok" : "warn", detail: gitVersion || "not found - the commit hook step will be skipped" },
    { id: "home", label: "Home directory", status: "ok", detail: homedir() },
    {
      id: "binary",
      label: "Server binary",
      status: hasLocalBin || shimOk ? "ok" : "fail",
      detail: hasLocalBin ? localBin : shimOk ? shim : "no local bin/rule-mcp.js and no working global shim",
    },
    {
      id: "shim",
      label: "Global shim",
      status: shimOk ? "ok" : shim ? "warn" : "warn",
      detail: shimOk ? shim : shim ? `${shim} - present but does not launch, it will be rewritten` : "absent - it will be created",
    },
  ];

  return {
    checks,
    context: { nodeVersion, packageManager, gitVersion, isLocalRepo, localBin, hasLocalBin, shim, shimOk, blocked: checks.some((check) => check.status === "fail") },
  };
}
