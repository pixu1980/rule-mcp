

/** Update policy: enablement, cadence, remote allowlist, manual hints. */
import { readFileSync } from "node:fs";

/** Default throttle between update checks (RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS). */
export const DEFAULT_INTERVAL_MS = 60_000;

/** @returns {boolean} */
export function autoUpdateEnabled() {
  return process.env.RULE_MCP_NO_AUTOUPDATE !== "1";
}

/**
 * How an available update is applied. The default applies it (ADR 131): a
 * newer release tag is checked out, pulled and reinstalled without asking.
 * `RULE_MCP_AUTO_UPDATE=notify` returns to announcing only.
 *
 * @returns {"notify"|"upgrade"}
 */
export function updateMode() {
  return process.env.RULE_MCP_AUTO_UPDATE === "notify" ? "notify" : "upgrade";
}

/**
 * Parse the throttle interval from the environment.
 * - unset / empty / NaN / negative → 60s (default)
 * - "0" → check on every invocation (no throttle)
 * - positive → seconds (may be fractional)
 *
 * @returns {number} interval in milliseconds
 */
export function intervalMs() {
  const raw = process.env.RULE_MCP_AUTO_UPDATE_INTERVAL_SECONDS;

  if (raw === undefined || raw === "") {
    return DEFAULT_INTERVAL_MS;
  }

  const n = Number(raw);

  if (!Number.isFinite(n) || n < 0) {
    return DEFAULT_INTERVAL_MS;
  }

  return n === 0 ? 0 : Math.max(Math.round(n * 1000), 1);
}

/**
 * Reduce a git remote to a comparable identity: host + path, without scheme,
 * credentials, port, `.git` suffix, or trailing slash.
 *
 * git accepts several spellings of the same repository - this project's own
 * remote is scp-style SSH while server.json declares the HTTPS form - so a
 * string compare would reject the legitimate case and teach everyone to disable
 * the check. Returns null for anything unusable, which matches nothing.
 *
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function normalizeRemoteUrl(url) {
  if (typeof url !== "string") {
    return null;
  }

  let value = url.trim();

  if (value === "") {
    return null;
  }

  // Local paths (used by tests and by clone-of-a-clone installs) have no host.
  if (value.startsWith("/") || value.startsWith(".") || value.startsWith("file://")) {
    return value.replace(/^file:\/\//, "").replace(/\/+$/, "") || null;
  }

  // scp-style: git@host:owner/repo.git → host/owner/repo
  const scp = value.match(/^(?:[^@/]+@)?([^/:]+):(?!\/)(.+)$/);
  value = scp ? `${scp[1]}/${scp[2]}` : value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^[^@/]+@/, "");

  // Strip a port on the host segment, then the .git suffix and trailing slashes.
  const [host, ...rest] = value.split("/");
  const path = rest
    .join("/")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  const identity = `${host.replace(/:\d+$/, "").toLowerCase()}/${path}`;

  return identity === "/" ? null : identity;
}

/** Repository declared by the shipped server.json, or null when unreadable. */
export function declaredRepository() {
  try {
    const manifest = JSON.parse(readFileSync(new URL("../../../server.json", import.meta.url), "utf8"));

    return manifest?.repository?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * The remotes this install may take code from.
 *
 * Precedence: an explicit RULE_MCP_UPDATE_REMOTE (comma-separated) REPLACES
 * the default - a fork or a test sandbox names its own upstream - otherwise the
 * repository declared in the shipped server.json is the only trusted source.
 * There is deliberately no trust-on-first-use fallback: pinning whatever the
 * remote happens to say would trust whoever edited .git/config first.
 *
 * @param {Record<string, string|undefined>} [environment]
 * @returns {string[]} normalized remote identities (possibly empty)
 */
export function resolveAllowedRemotes(environment = process.env) {
  const override = environment.RULE_MCP_UPDATE_REMOTE;
  const sources = override ? override.split(",") : [declaredRepository()];

  return sources.map((source) => normalizeRemoteUrl(source)).filter(Boolean);
}

/** Manual update command hint for install types we cannot auto-update. */
export function manualHint(type) {
  if (type === "npm") {
    return "Update with: git pull in your checkout, then ./scripts/install.sh (then restart the server).";
  }

  if (type === "docker") {
    return "Update with: docker compose pull && docker compose up -d.";
  }

  return "Auto-update is only available for git-clone installs.";
}
