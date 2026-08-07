// rule-architect detect - project value detection engine
// Pure logic, no DOM, no server. Used by both rule-architect-web and
// rule-architect's context-server to pre-fill the interview wizard.
//
// PRINCIPLE: DETECT OR STAY SILENT. Only emit a value we can actually infer
// from the project's own files. This detector used to invent ~27 fixed
// TTRPG/Electron values (AUTH_MECHANISM, DEPLOY_TARGET, MVP_STEP_*, PERSONA_*,
// hardcoded personas/user-stories/features) for EVERY project - even an empty
// one - because the architect was prototyped against one specific desktop app
// and that seed data was never genericized. The result: a React SaaS was
// pre-filled as "pure vanilla JavaScript / Electron desktop", contradicting
// the user's own answers. A minimal prefill the user completes always beats a
// confident-but-wrong one, so anything not grounded in a real file signal is
// gone. (De-overfitting the TEMPLATE prose that carries the same assumptions
// is tracked separately.)

import { readFileSync, existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";

// Lockfile -> package manager. The lockfile that is actually on disk is a
// reliable, framework-agnostic signal; the previous `pkg.workspaces` guess was
// not (workspaces do not imply pnpm).
const LOCKFILE_PKG_MANAGER = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
  ["bun.lockb", "bun"],
];

// The first H1 of a root markdown file is the one project-identity signal a
// generic doc reliably carries.
function firstH1(text) {
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

/**
 * Detect pre-fillable interview values from a project's own files. Returns only
 * values grounded in a real signal (never fabricates project-specific content),
 * so the returned object may be small or empty. Never throws: every read is
 * guarded, so a malformed package.json or unreadable file just yields no value.
 * @param {string} projectDir - the project directory to inspect ("." = cwd)
 * @returns {Record<string, string>} inferred wizard values (may be empty)
 */
export function detectProjectValues(projectDir) {
  const values = {};
  const dir = projectDir === "." ? process.cwd() : projectDir;

  // ── PROJECT_NAME: package.json name > root doc H1 > directory name ──
  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg && typeof pkg.name === "string" && pkg.name.trim() !== "") {
        values.PROJECT_NAME = pkg.name.trim();
      }
    } catch {
      // malformed package.json - fall through to the doc/dir fallbacks
    }
  }

  if (!values.PROJECT_NAME) {
    for (const file of ["CONTEXT.md", "README.md"]) {
      const docPath = join(dir, file);
      if (!existsSync(docPath)) continue;
      try {
        const heading = firstH1(readFileSync(docPath, "utf-8"));
        if (heading) {
          values.PROJECT_NAME = heading;
          break;
        }
      } catch {
        // unreadable doc - try the next candidate
      }
    }
  }

  if (!values.PROJECT_NAME) {
    const dirName = basename(resolve(dir));
    if (dirName) values.PROJECT_NAME = dirName;
  }

  // ── STACK_PKG_MANAGER: from the lockfile actually present ──
  for (const [lockfile, manager] of LOCKFILE_PKG_MANAGER) {
    if (existsSync(join(dir, lockfile))) {
      values.STACK_PKG_MANAGER = manager;
      break;
    }
  }

  return values;
}
