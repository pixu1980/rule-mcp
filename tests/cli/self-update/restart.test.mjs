/** T5-T6: banner and restart decisions, including the client-safe daemon default. */
import { strict as assert } from "node:assert";

import { buildBanner, scheduleRestartIfNeeded } from "../../../src/core/self-update/index.js";

console.log("self-update engine test: banner and restart");

// ── T5: banner + restart decisions (pure) ──
{
  assert.match(buildBanner({ updated: true, from: "aaaaaaa", to: "bbbbbbb", count: 2, changedSkills: true, changedCode: false }), /Updating MCP server/);
  assert.equal(buildBanner({ updated: false }), null, "no banner when nothing changed");

  // Every updated-combination banner: both, code-only, skills-only, neither.
  assert.match(buildBanner({ updated: true, from: "a", to: "b", count: 1, changedSkills: true, changedCode: true }), /skills \+ code/, "skills + code combo");
  assert.match(buildBanner({ updated: true, from: "a", to: "b", count: 1, changedSkills: false, changedCode: true }), /code file\(s\)/, "code-only combo");
  assert.match(buildBanner({ updated: true, from: "a", to: "b", count: 1, changedSkills: true, changedCode: false }), /Skills hot-reloaded\./, "skills-only hot-reload note");
  assert.match(buildBanner({ updated: true, from: "a", to: "b", count: 0, changedSkills: false, changedCode: false }), /\(0 file\(s\)\)/, "neither combo falls back to file(s)");
  assert.equal(buildBanner(null), null, "no result means no banner");
  assert.equal(buildBanner(undefined), null, "undefined result means no banner");

  // Refused-remote banners are never silent.
  assert.match(buildBanner({ updated: false, reason: "remote-not-allowed", remote: "github.com/evil/repo" }), /REFUSED/);
  assert.match(buildBanner({ updated: false, reason: "remote-not-allowed" }), /unknown/, "refused banner tolerates a missing remote");
  assert.match(buildBanner({ updated: false, reason: "no-allowed-remote" }), /REFUSED/);
  assert.match(buildBanner({ updated: false, reason: "unsigned-upstream", to: "deadbeef" }), /deadbeef/);
  assert.match(buildBanner({ updated: false, reason: "unsigned-upstream" }), /has no valid signature/, "unsigned banner tolerates a missing commit");
  assert.match(buildBanner({ skipped: true, reason: "npm", note: "Update with: pnpm add -g" }), /up to date on disk/);
  assert.equal(buildBanner({ updated: false, reason: "dirty-tree" }), null, "silent skips stay silent");

  // eslint-disable-next-line no-unused-vars
  let isExited = false;
  const note = scheduleRestartIfNeeded({ updated: true, changedCode: true }, () => {
    isExited = true;
  });
  assert.match(note, /restart/i, "code change schedules a restart note");

  process.env.RULE_MCP_NO_AUTORESTART = "1";
  const noRestart = scheduleRestartIfNeeded({ updated: true, changedCode: true }, () => {});
  assert.match(noRestart, /restart the server|reconnect/i, "opt-out yields an instruction, not an exit");
  delete process.env.RULE_MCP_NO_AUTORESTART;

  assert.equal(scheduleRestartIfNeeded({ updated: true, changedCode: false }), null, "no restart for skills-only");
  console.log("  ✅ banner and restart decisions are correct");
}

// ── T6: daemon mode never force-exits by default (protects connected clients) ──
{
  process.env.RULE_MCP_DAEMON = "1";
  let isDaemonExited = false;
  const daemonNote = scheduleRestartIfNeeded({ updated: true, changedCode: true }, () => {
    isDaemonExited = true;
  });
  assert.match(daemonNote, /daemon/i, "daemon mode explains a manual/opt-in restart");
  // Let any deferred (800ms) exit fire - a ref'd timer keeps the loop alive.
  await new Promise((r) => setTimeout(r, 900));
  assert.equal(isDaemonExited, false, "daemon mode must not force-exit by default");

  // Single-client daemons can opt back in - the deferred restart returns.
  process.env.RULE_MCP_DAEMON_AUTORESTART = "1";
  let isOptInExited = false;
  const optInNote = scheduleRestartIfNeeded({ updated: true, changedCode: true }, () => {
    isOptInExited = true;
  });
  assert.match(optInNote, /restart/i, "daemon opt-in yields a restart note");
  await new Promise((r) => setTimeout(r, 900));
  assert.equal(isOptInExited, true, "daemon opt-in performs the deferred restart");
  delete process.env.RULE_MCP_DAEMON_AUTORESTART;
  delete process.env.RULE_MCP_DAEMON;
  console.log("  ✅ daemon-mode restart is client-safe by default");
}

console.log("\nself-update: all checks passed");
