

/**
 * `rule-mcp init`: the shell path `/rule-mcp-init` names, and the same work.
 *
 * A project pointed at by `--dir` is prepared without touching this checkout:
 * the recorder directory is created under the state dir, the git governance is
 * installed or integrated, and the dependency report is printed.
 */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const BIN = fileURLToPath(new URL("../../../bin/rule-mcp.js", import.meta.url));

/** Run the CLI in a sandboxed home and state dir. */
function run(args) {
  const home = mkdtempSync(join(tmpdir(), "rule-mcp-cli-init-"));

  return {
    home,
    result: spawnSync(process.execPath, [BIN, ...args], {
      cwd: home,
      env: {
        ...process.env,
        HOME: home,
        RULE_MCP_HOME: join(home, "mcp"),
        RULE_MCP_STATE_DIR: join(home, "state"),
        RULE_MCP_NO_AUTOUPDATE: "1",
        RULE_MCP_NO_TELEMETRY: "1",
      },
      encoding: "utf8",
      timeout: 90_000,
    }),
  };
}

test("init prints the recorder directory and the dependency report", () => {
  const { home, result } = run(["init", "--dir", ".", "--no-tokensave"]);

  try {
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /^Project:\s/m, "the project root is reported");
    assert.match(result.stdout, /^Recorder dir:\s/m, "the central recorder directory is reported");
    assert.match(result.stdout, /^Deps:\s/m, "the dependency policy line is reported");
    assert.doesNotMatch(result.stdout, /tokensave/i, "--no-tokensave skips the tokensave line");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("init --help documents the option the prompt names", () => {
  const { home, result } = run(["init", "--help"]);

  try {
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /--no-tokensave/, "the option the prompt mentions is real");
    assert.match(result.stdout, /--dir/, "a project other than the cwd can be prepared");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
