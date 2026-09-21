

/** One self-update pass: gates, fetch, merge, the structured result. */
import { git } from "./_git.js";
import { reloadSkills as reloadSkillCatalog } from "@src/core/skills/_reload-port.js";
import { getRepoRoot, detectInstallType } from "../../cli/paths/index.js";
import { autoUpdateEnabled, normalizeRemoteUrl, resolveAllowedRemotes, manualHint } from "./_config.js";

/**
 * Perform the actual fetch / fast-forward / classify. Pure of process-lifecycle
 * concerns (restart is decided by the caller). Never throws.
 *
 * @param {{ reloadSkills?: boolean }} [opts]
 * @returns {Promise<{
 *   checked: boolean, updated: boolean, skipped?: boolean, reason?: string,
 *   from?: string, to?: string, count?: number,
 *   changedSkills?: boolean, changedCode?: boolean, note?: string
 * }>}
 */
export async function runSelfUpdate(opts = {}) {
  const { reloadSkills = true } = opts;

  if (!autoUpdateEnabled()) {
    return { checked: false, updated: false, skipped: true, reason: "disabled" };
  }

  const type = detectInstallType();

  if (type !== "git") {
    return { checked: true, updated: false, skipped: true, reason: type, note: manualHint(type) };
  }

  const root = getRepoRoot();

  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"], root);

  if (!branch || branch === "HEAD") {
    return { checked: true, updated: false, skipped: true, reason: "detached-head" };
  }

  const upstream = await git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], root);

  if (!upstream) {
    return { checked: true, updated: false, skipped: true, reason: "no-upstream" };
  }

  // ── Where the code comes from, verified BEFORE any fetch or merge ──
  // A fetch + ff-merge + restart is remote code execution. One line rewritten in
  // .git/config would otherwise be enough to own the server at the next tool call.
  const remoteName = upstream.includes("/") ? upstream.slice(0, upstream.indexOf("/")) : "origin";
  const remoteUrl = await git(["remote", "get-url", remoteName], root);
  const allowed = resolveAllowedRemotes();
  const identity = normalizeRemoteUrl(remoteUrl);

  if (allowed.length === 0) {
    return { checked: true, updated: false, skipped: true, reason: "no-allowed-remote", remote: remoteUrl ?? null };
  }

  if (!identity || !allowed.includes(identity)) {
    return { checked: true, updated: false, skipped: true, reason: "remote-not-allowed", remote: remoteUrl ?? null };
  }

  // Only TRACKED modifications block a fast-forward; untracked artifacts
  // (.tokensave/, build output, caches) are irrelevant to ff safety.
  const dirty = await git(["status", "--porcelain", "--untracked-files=no"], root);

  if (dirty === null) {
    return { checked: true, updated: false, skipped: true, reason: "git-error" };
  }

  if (dirty.length > 0) {
    return { checked: true, updated: false, skipped: true, reason: "dirty-tree" };
  }

  // Fetch (network); fail-open on offline/timeout.
  const fetched = await git(["fetch", "--quiet"], root);

  if (fetched === null) {
    return { checked: true, updated: false, skipped: true, reason: "fetch-failed" };
  }

  const before = await git(["rev-parse", "HEAD"], root);
  const remote = await git(["rev-parse", "@{u}"], root);

  if (!before || !remote) {
    return { checked: true, updated: false, skipped: true, reason: "git-error" };
  }

  if (before === remote) {
    return { checked: true, updated: false };
  }

  // Optional second gate: the upstream commit must carry a valid signature.
  // Off by default - most repositories do not sign, and failing closed would
  // silently stop every update instead of protecting anything.
  if (process.env.RULE_MCP_UPDATE_REQUIRE_SIGNATURE === "1") {
    const verified = await git(["verify-commit", "--raw", remote], root);

    if (verified === null) {
      return { checked: true, updated: false, skipped: true, reason: "unsigned-upstream", to: remote.slice(0, 7) };
    }
  }

  // Fast-forward only - never clobber local commits.
  const merged = await git(["merge", "--ff-only", "@{u}"], root);

  if (merged === null) {
    return { checked: true, updated: false, skipped: true, reason: "not-fast-forward" };
  }

  const after = await git(["rev-parse", "HEAD"], root);

  // `git merge --ff-only <ancestor>` exits 0 with "Already up to date" without
  // moving HEAD, which happens on every check while the local branch is AHEAD of
  // its upstream - the normal state during feature work. Treating that as an
  // update produced a banner claiming the server had just updated itself
  // (`updated 1cb8547→1cb8547 (0 files)`) on every tool call.
  if (!after || after === before) {
    return { checked: true, updated: false };
  }

  // Auditable trail, written only when HEAD actually moved: what was pulled,
  // and from where.
  process.stderr.write(`[rule-mcp] self-update ${before.slice(0, 7)}→${after.slice(0, 7)} from ${remoteUrl}\n`);

  const diff = (await git(["diff", "--name-only", before, after], root)) ?? "";
  const changed = diff.split("\n").filter(Boolean);
  const changedSkills = changed.some((p) => p.startsWith("skills/"));
  const changedCode = changed.some((p) => /^(?:src|bin)\//.test(p) || p === "package.json");

  if (changedSkills && reloadSkills) {
    await reloadSkillCatalog();
  }

  return {
    checked: true,
    updated: true,
    from: before.slice(0, 7),
    to: after.slice(0, 7),
    count: changed.length,
    changedSkills,
    changedCode,
  };
}
