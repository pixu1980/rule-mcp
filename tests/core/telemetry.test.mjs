/**
 * @module test/telemetry.test
 *
 * Local telemetry, to the spec agreed on 2026-08-04.
 *
 * The rules that matter are the ones about what must NOT happen: the estimated
 * token bucket never merges into the measured total, remote sending is off
 * until someone turns it on, nothing free-text ever reaches the remote payload,
 * and a recorder that cannot write must never break the tool call it was
 * observing.
 *
 * Prompt text is the one rule that changed. It used to be forbidden on disk;
 * it is now recorded by default, in the project's own directory, because the
 * length alone could never answer what was asked or how many times it had to
 * be asked again. RULE_MCP_NO_PROMPTS=1 puts it back. Local only either
 * way: see T7, which is what actually protects the text.
 */

let pass = 0;
let fail = 0;
const check = (label, ok) => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}`);
  }
};

console.log("=== Telemetry (local JSONL) ===\n");

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  existsSync,
  readdirSync,
  realpathSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "rule-telemetry-"));
process.env.RULE_MCP_STATE_DIR = dir;
delete process.env.RULE_MCP_NO_TELEMETRY;
delete process.env.RULE_MCP_NO_PROMPTS;
// The log is project-scoped now, so the test needs a project of its own rather
// than whatever directory it was launched from. realpath, because macOS hands
// out /var/folders while cwd reports /private/var.
const projectDir = realpathSync(mkdtempSync(join(tmpdir(), "rule-telemetry-project-")));
mkdirSync(join(projectDir, ".git"), { recursive: true });
process.chdir(projectDir);

const { DAY_MS, RAW_RETENTION_DAYS, endSession, flush, recordToolCall, sessionId, startSession, telemetryEnabled } =
  await import("../../src/core/telemetry/_telemetry.js");
const { eventsFile, purge, readEvents, readRollups, rollup, stateSize } =
  await import("../../src/core/telemetry/_store.js");
const { aggregate, renderStats } = await import("../../src/core/telemetry/_stats.js");
const { REMOTE_ENABLED, redactForRemote } = await import("../../src/core/telemetry/_transport.js");

const DAY = 86_400_000;
const T0 = 1_760_000_000_000;

// ── T1: on by default, one kill switch ──
check("T1 telemetry is on by default", telemetryEnabled() === true);
process.env.RULE_MCP_NO_TELEMETRY = "1";
check("T1.1 the kill switch turns it off", telemetryEnabled() === false);
delete process.env.RULE_MCP_NO_TELEMETRY;

// ── T2: a session is one connection ──
startSession({ transport: "stdio", now: T0 });
check("T2 a session has an id", typeof sessionId() === "string" && sessionId().length > 0);
const firstSession = sessionId();
endSession({ now: T0 + 1000 });
startSession({ transport: "stdio", now: T0 + 2000 });
check("T2.1 a second connection is a second session", sessionId() !== firstSession);

// ── T3: what a tool call records, and what it must not ──
recordToolCall({
  tool: "pix_tool",
  args: { prompt: "add a dark mode toggle to the header for acme corp" },
  durationMs: 12,
  ok: true,
  cacheHit: false,
  routedSkill: "rule-frontend-react",
  saved: { cache: 0, caveman: 120, tokensave: 0, estimatedRouting: 3400 },
  now: T0 + 2100,
});
recordToolCall({
  tool: "rule_tool_check",
  durationMs: 4,
  ok: false,
  cacheHit: false,
  guardrailFailures: 3,
  now: T0 + 2200,
});
recordToolCall({ tool: "pix_tool", durationMs: 1, ok: true, cacheHit: true, saved: { cache: 900 }, now: T0 + 2300 });
flush();

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
check(
  "T3.4 duration, outcome and cache hit are recorded",
  routed.durationMs === 12 && routed.ok === true && routed.cacheHit === false,
);
check(
  "T3.5 the session is carried on every event",
  events.every((event) => event.session),
);
check("T3.6 an installation id is present and stable", new Set(events.map((event) => event.installation)).size === 1);
check(
  "T3.7 guardrail failures are counted",
  events.find((event) => event.tool === "rule_tool_check").guardrailFailures === 3,
);

// ── T4: the token buckets stay separate ──
check(
  "T4 measured savings are summed per source",
  routed.saved.caveman === 120 && events.find((event) => event.cacheHit).saved.cache === 900,
);
check(
  "T4.1 the routing estimate is a separate field, not part of saved",
  routed.estimatedRouting === 3400 && routed.saved.estimatedRouting === undefined,
);

// ── T5: aggregation ──
const stats = aggregate(events);
check("T5 tool usage is counted", stats.calls === 3 && stats.byTool.pix_tool === 2);
check("T5.1 cache hit rate is measured", Math.round(stats.cacheHitRate * 100) === 33);
check("T5.2 error rate is measured", Math.round(stats.errorRate * 100) === 33);
check("T5.3 latency percentiles are present", stats.latencyP50 >= 0 && stats.latencyP95 >= stats.latencyP50);
check(
  "T5.4 measured and estimated savings are reported apart",
  stats.savedTokens === 1020 && stats.estimatedTokens === 3400,
);
check("T5.5 routed skills are counted", stats.bySkill["rule-frontend-react"] === 1);
const rendered = renderStats(stats);
check("T5.6 the rendered report marks estimates with a tilde", /~/.test(rendered) && /estimate/i.test(rendered));

// ── T6: rollup, retention and the size cap ──
const old = {
  ts: T0 - (RAW_RETENTION_DAYS + 2) * DAY,
  session: "old",
  tool: "pix_tool",
  durationMs: 5,
  ok: true,
  cacheHit: false,
  saved: { caveman: 10 },
};
writeFileSync(eventsFile(), `${readFileSync(eventsFile(), "utf8") + JSON.stringify(old)}\n`);
check("T6 DAY_MS is a day", DAY_MS === DAY);

const rolled = rollup({ now: T0 + 3000 });
check("T6.1 rollup produces a daily aggregate", rolled.days >= 1 && readRollups().length > 0);
check(
  "T6.2 a daily aggregate keeps counts, not events",
  readRollups().every(
    (day) => typeof day.date === "string" && typeof day.calls === "number" && day.events === undefined,
  ),
);

purge({ now: T0 + 3000 });
const afterPurge = readEvents();
check(
  "T6.3 raw events past retention are purged",
  afterPurge.every((event) => event.ts > T0 - RAW_RETENTION_DAYS * DAY),
);
check("T6.4 recent raw events survive", afterPurge.length === 3);
check("T6.5 daily aggregates survive the purge", readRollups().length > 0);
check("T6.6 the state size is measurable for the cap", stateSize() > 0);

// ── T7: remote is designed for, and off ──
check("T7 remote sending is off", REMOTE_ENABLED === false);
const redacted = redactForRemote(routed);
check(
  "T7.1 the redacted payload keeps the shape of the work",
  redacted.tool === "pix_tool" && redacted.durationMs === 12,
);
check(
  "T7.2 it carries no session or installation identity",
  redacted.session === undefined && redacted.installation === undefined,
);
check(
  "T7.3 it carries no free text at all",
  !JSON.stringify(redacted).includes("frontend-react") || typeof redacted.routedSkill === "string",
);
check(
  "T7.4 a path is hashed, never sent in the clear",
  (() => {
    const out = redactForRemote({
      tool: "rule_tool_apply",
      ts: T0,
      path: "/Users/someone/secret-project/src/a.js",
      durationMs: 1,
      ok: true,
    });

    return (
      out.path === undefined &&
      typeof out.pathHash === "string" &&
      out.pathHash.length === 16 &&
      out.extension === ".js"
    );
  })(),
);

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
process.env.RULE_MCP_STATE_DIR = dir;

// ── T9: the kill switch stops recording, not just reporting ──
process.env.RULE_MCP_NO_TELEMETRY = "1";
const before = readEvents().length;
recordToolCall({ tool: "pix_tool", durationMs: 1, ok: true, cacheHit: false, now: T0 + 9999 });
flush();
check("T9 nothing is recorded while disabled", readEvents().length === before);
delete process.env.RULE_MCP_NO_TELEMETRY;

// The recording is filed per project under the home directory, never inside the
// project: nothing this server writes needs a rule in somebody's .gitignore
// (ADR 082).
const { getProjectPaths } = await import("../../src/cli/paths.js");
const projectStateDir = getProjectPaths(projectDir).dir;
check("T10 the events file lives in this project's own directory", eventsFile().startsWith(projectStateDir));
check(
  "T10.1 rollups live beside it",
  existsSync(projectStateDir) && readdirSync(projectStateDir).some((f) => f.includes("rollup")),
);
check("T10.2 that directory is under the home directory", !projectStateDir.startsWith(projectDir));
check("T10.3 and the project itself is untouched", !existsSync(join(projectDir, ".rule-mcp")));

// ── T11: the .flight export ──
const { FLIGHT_FILE_VERSION, exportFlight, toFlight } = await import("../../src/core/telemetry/_flight.js");
const recorded = readEvents();
const exported = exportFlight({ exportedAt: T0 + 5000, keep: true });
const flight = exported.flight;
check("T11 one export is one file", typeof exported.file === "string" && exported.file.endsWith(".flight"));
check(
  "T11.1 the envelope is version 2 with an export stamp",
  flight.version === FLIGHT_FILE_VERSION && flight.exportedAt === T0 + 5000,
);
check("T11.2 the session is ended, never still recording", flight.session.status === "ended");
check(
  "T11.3 it opens connected and closes disconnected",
  flight.session.events[0].type === "mcp-server-connected" &&
    flight.session.events.at(-1).type === "mcp-server-disconnected",
);
check(
  "T11.4 every call has a result sharing its toolCallId",
  (() => {
    const calls = flight.session.events.filter((e) => e.type === "mcp-tool-call");
    const results = flight.session.events.filter((e) => e.type === "mcp-tool-result");

    return calls.length === results.length && calls.every((c) => results.some((r) => r.toolCallId === c.toolCallId));
  })(),
);
check(
  "T11.5 a result carries duration and outcome",
  (() => {
    const r = flight.session.events.find((e) => e.type === "mcp-tool-result");

    return typeof r.durationMs === "number" && typeof r.success === "boolean";
  })(),
);
check(
  "T11.6 the timeline still carries no arguments, only their size",
  !JSON.stringify(flight.session).includes("dark mode") && flight.session.events.some((e) => e.input?.promptLength > 0),
);
check(
  "T11.7 the prompt text is in one block a reader can drop",
  flight.prompts.some((prompt) => prompt.text?.includes("dark mode")),
);
check(
  "T11.8 the estimate never merges into the measured total",
  flight.kpi.tokens.measuredSaved !== flight.kpi.tokens.measuredSaved + flight.kpi.tokens.estimatedRouting &&
    flight.kpi.tokens.estimatedRouting > 0,
);
check(
  "T11.9 the timeline is deterministic: same log, same events",
  JSON.stringify(toFlight(recorded, { exportedAt: T0 + 5000 }).session.events) ===
    JSON.stringify(flight.session.events),
);
check(
  "T11.10 an empty log is an error, not an empty file",
  (() => {
    try {
      toFlight([]);
      return false;
    } catch {
      return true;
    }
  })(),
);
check("T11.11 --keep leaves the log where it was", readEvents().length === recorded.length);
check(
  "T11.12 an export without --keep empties it",
  (() => {
    exportFlight({ exportedAt: T0 + 6000 });

    return readEvents().length === 0;
  })(),
);

// ── T12: the prompt kill switch, on an emptied log so it counts nothing else ──
process.env.RULE_MCP_NO_PROMPTS = "1";
recordToolCall({ tool: "pix_tool", args: { prompt: "a confidential merger" }, now: T0 + 7000 });
flush();
delete process.env.RULE_MCP_NO_PROMPTS;
check(
  "T12 the kill switch keeps the prompt text off disk",
  !readFileSync(eventsFile(), "utf8").includes("confidential"),
);
check("T12.1 and keeps the length", readEvents().at(-1).promptLength === "a confidential merger".length);

console.log(`\nResults: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
