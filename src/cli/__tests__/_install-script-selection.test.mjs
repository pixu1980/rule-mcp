/**
 * A targeted install configures what it was told to, and nothing else.
 *
 * The regression this guards is old and still worth guarding: an installer
 * that took `--agent pi` and then went on to configure every IDE it could
 * find. The plan is in node now (ADR 080), so the assertion is on what the
 * bootstrap's piped run prints - one agent step, the requested mode, and no
 * step nobody asked for.
 */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("a targeted shell install keeps to its agent, its mode and its steps", () => {
  const root = new URL("../../..", import.meta.url).pathname;
  const home = mkdtempSync(join(tmpdir(), "rule-selection-"));

  try {
    const output = execFileSync("bash", ["scripts/install.sh", "--agent", "pi", "--mode", "daemon", "--dry-run", "--no-rules", "--no-doctor"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        TERM: "dumb",
        HOME: home,
        PNPM_HOME: join(home, ".pnpm"),
        RULE_MCP_SKIP_GLOBAL_LINK: "1",
      },
      timeout: 120_000,
    });

    assert.match(output, /Configure pi \(mode daemon\)/, "the plan must forward the requested mode");
    assert.doesNotMatch(output, /Configure (?!pi\b)/, `no agent but pi was asked for:\n${output}`);
    assert.match(output, /Platform daemon service/, "daemon mode registers its service");
    // Both are opt-in: a run that never ticked them must not perform them.
    assert.doesNotMatch(output, /Instruction files/, "--no-rules must leave the instruction files alone");
    assert.doesNotMatch(output, /Bundled rule-\* skills/, "a non-interactive run must not centralize 89 skills");
    assert.match(output, /Nothing was written/, "a dry run writes nothing and says so");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
