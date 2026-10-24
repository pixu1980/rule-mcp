

/** Resume announcements: the per-session record and the once-per-process latch. */
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const stateDir = mkdtempSync(join(tmpdir(), "rule-mcp-resume-"));

test.after(() => {
  rmSync(stateDir, { recursive: true, force: true });
  delete process.env.RULE_MCP_STATE_DIR;
});

process.env.RULE_MCP_STATE_DIR = stateDir;

const { markAnnounced, wasAnnouncedThisSession, clearAnnounced, resumeAnnouncement } = await import("../_announce.js");

const { scriptedRepository } = await import("../../../../tools/handon/__tests__/_handon.fixture.mjs");
const cwd = mkdtempSync(join(tmpdir(), "rule-mcp-resume-project-"));

test.after(() => rmSync(cwd, { recursive: true, force: true }));

test("markAnnounced and clearAnnounced toggle the per-session record", () => {
  assert.equal(wasAnnouncedThisSession(cwd), false, "nothing announced yet");

  markAnnounced(cwd, Date.now());
  assert.equal(wasAnnouncedThisSession(cwd), true, "a fresh record counts");

  clearAnnounced(cwd);
  assert.equal(wasAnnouncedThisSession(cwd), false, "the record is gone");

  markAnnounced(cwd, 1);
  assert.equal(wasAnnouncedThisSession(cwd), false, "a record older than this process is a previous session");
  clearAnnounced(cwd);
});

test("resumeAnnouncement announces a resume prompt and stays quiet otherwise", () => {
  const { root } = scriptedRepository();
  const first = resumeAnnouncement({ prompt: "resume", cwd: root, force: true });
  assert.ok(first !== "", "a resume signal announces");
  assert.match(first, /PIX RESUMED SESSION/, "the block names the resumed session");

  const second = resumeAnnouncement({ prompt: "resume", cwd: root, force: true });
  assert.equal(second, "", "the persisted record closes the announcement");

  clearAnnounced(root);
  const other = resumeAnnouncement({ prompt: "add a button to the header", cwd: root, force: true });
  assert.equal(other, "", "a non-resume prompt never announces");
  rmSync(root, { recursive: true, force: true });
});
test("the handoff block can be switched off and the latch closes without force", async () => {
  const { root } = scriptedRepository();
  process.env.RULE_MCP_NO_RESUME_HANDON = "1";
  const off = resumeAnnouncement({ prompt: "resume", cwd: root, force: true });
  assert.equal(off, "", "the opt-out silences the block");
  delete process.env.RULE_MCP_NO_RESUME_HANDON;

  const first = resumeAnnouncement({ prompt: "resume", cwd: root, force: true });
  assert.ok(first !== "", "the block returns once the opt-out is off");
  const latched = resumeAnnouncement({ prompt: "resume" });
  assert.equal(latched, "", "the once-per-process latch closes without force");
});
