

/** CLI registrar arms: doctor, skills, agent-commands and legacy names, in subprocesses. */
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const BIN = new URL("../../../bin/rule-mcp.js", import.meta.url).pathname;

/** Run the CLI in a subprocess with a sandboxed home and state. */
function runCli(args, { cwd, env = {} } = {}) {
  const home = mkdtempSync(join(tmpdir(), "rule-cli-arms-"));
  try {
    const out = execFileSync(process.execPath, [BIN, ...args], {
      cwd: cwd ?? home,
      env: {
        ...process.env,
        HOME: home,
        RULE_MCP_HOME: join(home, "mcp"),
        RULE_MCP_NO_AUTOUPDATE: "1",
        RULE_MCP_NO_TELEMETRY: "1",
        RULE_MCP_SSE_TOKEN: "e".repeat(64),
        ...env,
      },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 90_000,
    });

    return { out, err: "", home };
  } catch (error) {
    return { out: error.stdout ?? "", err: error.stderr ?? "", home };
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

test("doctor --json and --json-out render machine output", () => {
  const json = runCli(["doctor", "--json"]);
  assert.match(json.out, /"version"/, "the json report starts with the version");
  assert.equal(json.err, "", "no stderr noise");

  const target = join(tmpdir(), `rule-doctor-out-${Date.now()}.json`);
  const out = runCli(["doctor", "--json-out", target]);
  assert.match(out.out, /JSON exported to/, "the export path is reported");
  assert.match(readFileSync(target, "utf8"), /"version"/, "the file carries the report");
  rmSync(target, { force: true });
});

test("skills list renders text and json", () => {
  const list = runCli(["skills", "list"]);
  assert.match(list.out, /rule-.*skill|Pix/i, "the skills list renders");
  const json = runCli(["skills", "list", "--json"]);
  assert.match(json.out, /^\[/, "the json list opens with an array");
});

test("agent-commands without a dir fails loudly", () => {
  const res = runCli(["agent-commands"]);
  assert.match(res.out + res.err, /requires --dir|--list/, "the missing dir is named");
});

test("agent-commands --list and --format booleans render", () => {
  const listed = runCli(["agent-commands", "--list"]);
  assert.ok(listed.out.trim().length > 0, "command names render");

  const bad = runCli(["agent-commands", "--dir", "/tmp", "--format", "nope"]);
  assert.match(bad.out + bad.err, /Unknown --format/, "a bad format fails loudly");
});

test("handoff with no arguments renders the contract text", () => {
  const project = mkdtempSync(join(tmpdir(), "rule-cli-handoff-"));
  mkdirSync(join(project, "docs"), { recursive: true });
  const res = runCli(["handoff"], { cwd: project });
  assert.ok(res.out.length > 0, "the handoff prompt renders");
  rmSync(project, { recursive: true, force: true });
});

test("skills reload reports done", () => {
  const res = runCli(["skills", "reload"]);
  assert.match(res.out, /reload/i, "the reload command reports");
});

test("handoff doctor --fix alone points at --fix-commits for the messages", async () => {
  const { seedRepo } = await import("../../../tests/docs/docs-numbering-doctor/_doctor.fixture.mjs");
  const root = seedRepo();

  const fixed = runCli(["handoff", "doctor", "--dir", root, "--fix"], { cwd: root });
  assert.match(fixed.out, /Renumbered/, "the fix applies");
  assert.match(fixed.out, /Commit messages were not touched\. Add --fix-commits/, "the messages hint renders");
  rmSync(root, { recursive: true, force: true });
});

test("handoff doctor --fix-commits alone rewrites messages without moving files", async () => {
  const { seedRepo } = await import("../../../tests/docs/docs-numbering-doctor/_doctor.fixture.mjs");
  const root = seedRepo();

  const res = runCli(["handoff", "doctor", "--dir", root, "--fix-commits"], { cwd: root });
  assert.match(res.out, /Rewrote \d+ commit message\(s\)|Commit messages left alone/, "the commit rewrite reports either way");
  assert.doesNotMatch(res.out, /Renumbered \d+ document/, "no files move without --fix");
  rmSync(root, { recursive: true, force: true });
});

test("handoff honors explicit format and mode flags", () => {
  const project = mkdtempSync(join(tmpdir(), "rule-cli-handoff-flags-"));
  mkdirSync(join(project, "docs"), { recursive: true });

  const res = runCli(["handoff", "--format", "brief", "--mode", "close-session", "--compress"], { cwd: project });
  assert.ok(res.out.length > 0, "the flagged handoff renders");
  assert.equal(res.err, "", "no stderr noise");
  rmSync(project, { recursive: true, force: true });
});

test("handoff doctor plans, applies and rewrites in a collision repo", async () => {
  const { seedRepo } = await import("../../../tests/docs/docs-numbering-doctor/_doctor.fixture.mjs");
  const root = seedRepo();

  const dry = runCli(["handoff", "doctor", "--dir", root], { cwd: root });
  assert.match(dry.out, /collision\(s\) found/, "the doctor renders its plan");
  assert.equal(dry.out.includes("already published"), false, "the local repo is unpublished");

  const applied = runCli(["handoff", "doctor", "--dir", root, "--fix", "--fix-commits"], { cwd: root });
  assert.match(applied.out, /Renumbered/, "the fix applies");
  rmSync(root, { recursive: true, force: true });
});
