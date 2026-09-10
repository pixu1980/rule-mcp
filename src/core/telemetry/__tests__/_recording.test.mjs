

/** Recording rules: what a tool call records, what it must not, and the kill switches. */
import { chmodSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, finish, seedEvents, stateDir, T0, recorder, store } from "./_telemetry.fixture.mjs";

const { flush, recordToolCall, sessionId, telemetryEnabled } = recorder;
const { eventsFile, readEvents } = store;

console.log("=== Telemetry: recording ===\n");

// ── T1: on by default, one kill switch ──
check("T1 telemetry is on by default", telemetryEnabled() === true);
process.env.RULE_MCP_NO_TELEMETRY = "1";
check("T1.1 the kill switch turns it off", telemetryEnabled() === false);
delete process.env.RULE_MCP_NO_TELEMETRY;

// ── T2: a session is one connection ──
const { firstSession } = seedEvents();
check("T2 a session has an id", typeof sessionId() === "string" && sessionId().length > 0);
check("T2.1 a second connection is a second session", sessionId() !== firstSession);

const raw = readFileSync(eventsFile(), "utf8");
check(
  "T3 events land as one JSON object per line",
  raw
    .trim()
    .split("\n")
    .every((line) => {
      try {
        JSON.parse(line);
        return true;
      } catch {
        return false;
      }
    }),
);
check("T3.1 the prompt text is recorded by default", raw.includes("dark mode") && raw.includes("acme"));
check(
  "T3.2 the prompt length is kept alongside it",
  JSON.parse(
    raw
      .trim()
      .split("\n")
      .find((l) => l.includes("promptLength")),
  )?.promptLength > 0,
);

const events = readEvents();
const routed = events.find((event) => event.tool === "pix_tool" && !event.cacheHit);
check("T3.3 the routed skill is recorded", routed.routedSkill === "rule-frontend-react");
check("T3.4 duration, outcome and cache hit are recorded", routed.durationMs === 12 && routed.ok === true && routed.cacheHit === false);
check(
  "T3.5 the session is carried on every event",
  events.every((event) => event.session),
);
check("T3.6 an installation id is present and stable", new Set(events.map((event) => event.installation)).size === 1);
check("T3.7 guardrail failures are counted", events.find((event) => event.tool === "rule_tool_check").guardrailFailures === 3);

// ── T4: the token buckets stay separate ──
check("T4 measured savings are summed per source", routed.saved.caveman === 120 && events.find((event) => event.cacheHit).saved.cache === 900);
check("T4.1 the routing estimate is a separate field, not part of saved", routed.estimatedRouting === 3400 && routed.saved.estimatedRouting === undefined);

// ── T8: never break the call it observes ──
const readOnly = mkdtempSync(join(tmpdir(), "rule-telemetry-ro-"));
chmodSync(readOnly, 0o500);
process.env.RULE_MCP_STATE_DIR = readOnly;
let threw = false;
try {
  recordToolCall({ tool: "pix_tool", durationMs: 1, ok: true, cacheHit: false, now: T0 });
  flush();
} catch {
  threw = true;
}
check("T8 an unwritable state dir never throws", threw === false);
chmodSync(readOnly, 0o700);
process.env.RULE_MCP_STATE_DIR = stateDir;

// ── T9: the kill switch stops recording, not just reporting ──
process.env.RULE_MCP_NO_TELEMETRY = "1";
const before = readEvents().length;
recordToolCall({ tool: "pix_tool", durationMs: 1, ok: true, cacheHit: false, now: T0 + 9999 });
flush();
check("T9 nothing is recorded while disabled", readEvents().length === before);
delete process.env.RULE_MCP_NO_TELEMETRY;

// ── T12: the prompt kill switch, on an emptied log so it counts nothing else ──
process.env.RULE_MCP_NO_PROMPTS = "1";
recordToolCall({ tool: "pix_tool", args: { prompt: "a confidential merger" }, now: T0 + 7000 });
flush();
delete process.env.RULE_MCP_NO_PROMPTS;
check("T12 the kill switch keeps the prompt text off disk", !readFileSync(eventsFile(), "utf8").includes("confidential"));
check("T12.1 and keeps the length", readEvents().at(-1).promptLength === "a confidential merger".length);

finish();
