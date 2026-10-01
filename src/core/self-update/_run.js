

/** One self-update pass: gates, fetch, release-or-merge, the structured result. */
import { git } from "./_git.js";
import { reloadSkills as reloadSkillCatalog } from "@src/core/skills/_reload-port.js";
import { getRepoRoot, detectInstallType } from "../../cli/paths/index.js";
import { autoUpdateEnabled, normalizeRemoteUrl, resolveAllowedRemotes, manualHint, updateMode } from "./_config.js";

/**
 * Perform the actual fetch / upgrade-or-fast-forward / classify. Pure of
 * process-lifecycle concerns (restart is decided by the caller). Never throws.
 *
 * @param {{ reloadSkills?: boolean, mode?: "notify"|"upgrade", explicit?: boolean, reinstall?: Function }} [opts]
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

  const dirty = await git(["status", "--porcelain", "--untracked-files=no"], root);

  if (dirty === null) {
    return { checked: true, updated: false, skipped: true, reason: "git-error" };
  }

  if (dirty.length > 0) {
    return { checked: true, updated: false, skipped: true, reason: "dirty-tree" };
  }

  // -p -P: branches and tags the remote dropped are dropped here too, so a
  // withdrawn release is never read as the newest one (ADR 131).
  const fetched = await git(["fetch", "--quiet", "-p", "-P"], root);

  if (fetched === null) {
    return { checked: true, updated: false, skipped: true, reason: "fetch-failed" };
  }

  const { releaseState } = await import("./_release.js");
  const release = await releaseState(root);

  if (release.latest) {
    return releaseUpdate({ root, release, opts, branch });
  }

  return branchFastForward({ root, remoteUrl, reloadSkills, opts });
}

/**
 * The update once the remote publishes release tags: move to the newest one.
 *
 * @param {{ root: string, release: { latest: { tag: string, version: string }, current: string, newer: boolean }, opts: object, branch: string }} input
 * @returns {Promise<object>}
 */
async function releaseUpdate({ root, release, opts, branch }) {
  if (!release.newer) {
    return { checked: true, updated: false };
  }

  const available = {
    checked: true,
    updated: false,
    available: true,
    release: release.latest.tag,
    from: release.current,
    to: release.latest.version,
  };

  if ((opts.mode ?? updateMode()) === "notify") {
    return available;
  }

  if (process.env.RULE_MCP_UPDATE_REQUIRE_SIGNATURE === "1" && (await git(["verify-tag", release.latest.tag], root)) === null) {
    return { ...available, skipped: true, reason: "unsigned-upstream" };
  }

  const { RELEASE_BRANCH } = await import("./_release.js");

  // Another branch is somebody's work in progress: the automatic check says
  // so, and only the explicit command switches it away.
  if (branch !== RELEASE_BRANCH && !opts.explicit) {
    return { ...available, skipped: true, reason: "not-on-main", branch };
  }

  const { applyUpgrade } = await import("./_upgrade.js");

  return applyUpgrade({ root, current: release.current, latest: release.latest, reinstall: opts.reinstall });
}

/**
 * Fallback when no release tag exists yet: fast-forward the upstream branch.
 *
 * @param {{ root: string, remoteUrl: string|null, reloadSkills: boolean, opts: object }} input
 * @returns {Promise<object>}
 */
async function branchFastForward({ root, remoteUrl, reloadSkills, opts }) {
  const before = await git(["rev-parse", "HEAD"], root);
  const remote = await git(["rev-parse", "@{u}"], root);

  if (!before || !remote) {
    return { checked: true, updated: false, skipped: true, reason: "git-error" };
  }

  if (before === remote) {
    return { checked: true, updated: false };
  }

  if ((opts.mode ?? updateMode()) === "notify") {
    const behind = Number(await git(["rev-list", "--count", "HEAD..@{u}"], root));

    if (!Number.isFinite(behind) || behind === 0) {
      return { checked: true, updated: false };
    }

    return {
      checked: true,
      updated: false,
      available: true,
      from: before.slice(0, 7),
      to: remote.slice(0, 7),
      behind,
    };
  }

  if (process.env.RULE_MCP_UPDATE_REQUIRE_SIGNATURE === "1") {
    const verified = await git(["verify-commit", "--raw", remote], root);

    if (verified === null) {
      return { checked: true, updated: false, skipped: true, reason: "unsigned-upstream", to: remote.slice(0, 7) };
    }
  }

  const merged = await git(["merge", "--ff-only", "@{u}"], root);

  if (merged === null) {
    return { checked: true, updated: false, skipped: true, reason: "not-fast-forward" };
  }

  const after = await git(["rev-parse", "HEAD"], root);

  if (!after || after === before) {
    return { checked: true, updated: false };
  }

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
