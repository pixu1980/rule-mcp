

/**
 * @module test/self-update.test
 *
 * Tests the self-update engine against real, sandboxed git repositories:
 * fast-forward pull + change classification, banner/restart decisions, and the
 * safety guards (dirty tree, no upstream, opt-out). Uses injectable helpers so
 * no real process exit or network is involved.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import "../../../../tests/fixtures/git-hermetic.mjs";

// Server code resolves `@src/*` through a hook (ADR 089); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

export const g = (arguments_, cwd) => execFileSync("git", arguments_, { cwd, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" });

/** Build a bare "upstream" + a working clone that tracks it. */
export function makeClonePair() {
  const base = mkdtempSync(join(tmpdir(), "rule-su-"));
  const upstream = join(base, "upstream.git");
  const clone = join(base, "clone");
  mkdirSync(upstream);
  g(["init", "--bare", "-b", "main"], upstream);
  // Seed via a temp working copy pushed to the bare upstream.
  const seed = join(base, "seed");
  mkdirSync(seed);
  g(["init", "-b", "main"], seed);
  g(["config", "user.email", "t@t.t"], seed);
  g(["config", "user.name", "t"], seed);
  mkdirSync(join(seed, "skills", "rule"), { recursive: true });
  writeFileSync(join(seed, "skills", "rule", "SKILL.md"), "v1\n");
  mkdirSync(join(seed, "src"), { recursive: true });
  writeFileSync(join(seed, "src", "server.js"), "// v1\n");
  g(["add", "-A"], seed);
  g(["commit", "-m", "seed"], seed);
  g(["remote", "add", "origin", upstream], seed);
  g(["push", "-u", "origin", "main"], seed);
  // The clone under test.
  g(["clone", upstream, clone], base);
  g(["config", "user.email", "t@t.t"], clone);
  g(["config", "user.name", "t"], clone);
  return { base, upstream, clone, seed };
}

/** Advance the upstream by editing given files, returning nothing. */
export function pushUpstreamChange(seed, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(seed, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content);
  }
  g(["add", "-A"], seed);
  g(["commit", "-m", "upstream change"], seed);
  g(["push", "origin", "main"], seed);
}

/**
 * Run runSelfUpdate against a clone by pointing getRepoRoot there via a fresh
 * module import with a stubbed paths module is overkill; instead we exercise the
 * pure git logic by replicating runSelfUpdate's steps is also overkill. We run
 * the real module with RULE_MCP_GALAXY_MCP overriding cwd through a child process.
 */
export function runUpdateIn(clone, environment = {}, reloadSkills = false) {
  const script = `
    import { runSelfUpdate } from ${JSON.stringify(new URL("../index.js", import.meta.url).href)};
    const r = await runSelfUpdate({ reloadSkills: ${reloadSkills} });
    process.stdout.write(JSON.stringify(r));
  `;
  const out = execFileSync(process.execPath, ["--import", ALIAS_HOOK, "--input-type=module", "--eval", script], {
    cwd: clone,
    // Force the module to treat `clone` as the repo root by running from there and
    // relying on detectInstallType(.git) - but getRepoRoot resolves from module path.
    // So instead we pass an explicit override the module honors:
    env: { ...process.env, RULE_MCP_REPO_ROOT: clone, ...environment },
    encoding: "utf8",
  });
  return JSON.parse(out);
}
