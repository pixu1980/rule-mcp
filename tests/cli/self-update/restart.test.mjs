/** T5-T6: banner and restart decisions, including the client-safe daemon default. */
import { strict as assert } from "node:assert";

import { buildBanner, scheduleRestartIfNeeded } from "../../../src/core/self-update/index.js";

console.log("self-update engine test: banner and restart");

// ── T5: banner + restart decisions (pure) ──
{
  assert.match(
    buildBanner({ updated: true, from: "aaaaaaa", to: "bbbbbbb", count: 2, changedSkills: true, changedCode: false }),
    /Updating MCP server/,
  );
  assert.equal(buildBanner({ updated: false }), null, "no banner when nothing changed");

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
