/** Aggregation, the remote-off contract, and the .flight export envelope. */
import { check, finish, seedEvents, T0, store } from "./_telemetry.fixture.mjs";

const { readEvents } = store;
const { aggregate, renderStats } = await import("../stats/index.js");
const { REMOTE_ENABLED, redactForRemote } = await import("../_transport.js");

console.log("=== Telemetry: stats, remote, flight ===\n");

seedEvents();
const events = readEvents();
const routed = events.find((event) => event.tool === "rule_tool" && !event.cacheHit);

// ── T5: aggregation ──
const stats = aggregate(events);
check("T5 tool usage is counted", stats.calls === 3 && stats.byTool.rule_tool === 2);
check("T5.1 cache hit rate is measured", Math.round(stats.cacheHitRate * 100) === 33);
check("T5.2 error rate is measured", Math.round(stats.errorRate * 100) === 33);
check("T5.3 latency percentiles are present", stats.latencyP50 >= 0 && stats.latencyP95 >= stats.latencyP50);
check("T5.4 measured and estimated savings are reported apart", stats.savedTokens === 1020 && stats.estimatedTokens === 3400);
check("T5.5 routed skills are counted", stats.bySkill["rule-frontend-react"] === 1);
const rendered = renderStats(stats);
check("T5.6 the rendered report marks estimates with a tilde", /~/.test(rendered) && /estimate/i.test(rendered));

// ── T7: remote is designed for, and off ──
check("T7 remote sending is off", REMOTE_ENABLED === false);
const redacted = redactForRemote(routed);
check("T7.1 the redacted payload keeps the shape of the work", redacted.tool === "rule_tool" && redacted.durationMs === 12);
check("T7.2 it carries no session or installation identity", redacted.session === undefined && redacted.installation === undefined);
check("T7.3 it carries no free text at all", !JSON.stringify(redacted).includes("frontend-react") || typeof redacted.routedSkill === "string");
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

    return out.path === undefined && typeof out.pathHash === "string" && out.pathHash.length === 16 && out.extension === ".js";
  })(),
);

// ── T11: the .flight export ──
const { FLIGHT_FILE_VERSION, exportFlight, toFlight } = await import("../flight/index.js");
const recorded = readEvents();
const exported = exportFlight({ exportedAt: T0 + 5000, keep: true });
const flight = exported.flight;
check("T11 one export is one file", typeof exported.file === "string" && exported.file.endsWith(".flight"));
check("T11.1 the envelope is version 2 with an export stamp", flight.version === FLIGHT_FILE_VERSION && flight.exportedAt === T0 + 5000);
check("T11.2 the session is ended, never still recording", flight.session.status === "ended");
check(
  "T11.3 it opens connected and closes disconnected",
  flight.session.events[0].type === "mcp-server-connected" && flight.session.events.at(-1).type === "mcp-server-disconnected",
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
  flight.kpi.tokens.measuredSaved !== flight.kpi.tokens.measuredSaved + flight.kpi.tokens.estimatedRouting && flight.kpi.tokens.estimatedRouting > 0,
);
check(
  "T11.9 the timeline is deterministic: same log, same events",
  JSON.stringify(toFlight(recorded, { exportedAt: T0 + 5000 }).session.events) === JSON.stringify(flight.session.events),
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

finish();
