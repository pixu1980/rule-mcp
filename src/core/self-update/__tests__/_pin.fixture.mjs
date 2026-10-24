// test/self-update-remote-pin fixture
//
// Audit finding 06 - the forced self-update fetches and fast-forwards on every
// tool call, then hot-reloads skills and schedules a restart into the new code.
// It verified nothing about WHERE the code came from: no remote allowlist, no
// signature. Anyone able to write one line into .git/config (a dependency
// postinstall, a shared box, a .git baked into an image) got code execution in
// the MCP server at the next tool call, unprompted.
//
// The fix pins the upstream: the remote URL must match what the shipped
// server.json declares, or an explicit RULE_MCP_UPDATE_REMOTE override.
// URL comparison has to survive the forms git actually uses - this repo's own
// remote is scp-style SSH while server.json declares HTTPS.
//
// Signature verification is available but opt-in: most repositories do not sign
// commits, and defaulting it on would silently stop every update.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import "../../../../tests/fixtures/git-hermetic.mjs";

// Server code resolves `@src/*` through a hook (ADR 089); a spawned
// process loads it too, so it registers the hook as every entry point does.
const ALIAS_HOOK = fileURLToPath(new URL("../../../../scripts/alias-hook.mjs", import.meta.url));

export const git = (arguments_, cwd) => execFileSync("git", arguments_, { cwd, stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" });

/** A bare upstream plus a clone that tracks it, with one upstream commit ahead. */
export function makeClonePair() {
  const base = mkdtempSync(join(tmpdir(), "rule-mcp-pin-"));
  const upstream = join(base, "upstream.git");
  const seed = join(base, "seed");
  const clone = join(base, "clone");
  mkdirSync(upstream);
  git(["init", "--bare", "-b", "main"], upstream);
  mkdirSync(seed);
  git(["init", "-b", "main"], seed);
  git(["config", "user.email", "t@t.t"], seed);
  git(["config", "user.name", "t"], seed);
  mkdirSync(join(seed, "skills", "rule-mcp"), { recursive: true });
  writeFileSync(join(seed, "skills", "rule-mcp", "SKILL.md"), "v1\n");
  git(["add", "-A"], seed);
  git(["commit", "-m", "seed"], seed);
  git(["remote", "add", "origin", upstream], seed);
  git(["push", "-u", "origin", "main"], seed);
  git(["clone", upstream, clone], base);
  git(["config", "user.email", "t@t.t"], clone);
  git(["config", "user.name", "t"], clone);
  // Move the upstream forward so there is something to fast-forward to.
  writeFileSync(join(seed, "skills", "rule-mcp", "SKILL.md"), "v2\n");
  git(["add", "-A"], seed);
  git(["commit", "-m", "upstream change"], seed);
  git(["push", "origin", "main"], seed);
  return { base, upstream, clone };
}

/** Run the real runSelfUpdate against `clone` in a child process. */
export function runUpdateIn(clone, environment = {}) {
  const script = `
    import { runSelfUpdate } from ${JSON.stringify(new URL("../index.js", import.meta.url).href)};
    process.stdout.write(JSON.stringify(await runSelfUpdate({ reloadSkills: false })));
  `;
  const out = execFileSync(process.execPath, ["--import", ALIAS_HOOK, "--input-type=module", "--eval", script], {
    cwd: clone,
    env: { ...process.env, RULE_MCP_REPO_ROOT: clone, ...environment },
    encoding: "utf8",
  });
  return JSON.parse(out);
}
