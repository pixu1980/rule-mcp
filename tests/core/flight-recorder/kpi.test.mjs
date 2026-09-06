/**
 * @module test/flight-recorder/kpi
 *
 * F6: the numbers the hand-written reports had to work out - measured where
 * they can be, marked estimated where they cannot.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeCheck, makeSandbox, recordSampleSession, writePiFixture, T0 } from "./_flight.fixture.mjs";

const { check, finish } = makeCheck("Flight recorder: KPI block");
const { workspace, project } = makeSandbox();

const { readEvents } = await import("../../../src/core/telemetry/store/index.js");
const telemetry = await import("../../../src/core/telemetry/recorder/index.js");

recordSampleSession(telemetry);

const fake = writePiFixture(workspace, project);
const { readAgentUsage } = await import("../../../src/core/agents/transcripts/index.js");
const piUsage = readAgentUsage({ agent: "pi", projectDir: project, home: fake });

// A minimal snapshot fixture, so productivity ratios have lines to count.
mkdirSync(join(project, "src", "components", "ContactCard"), { recursive: true });
writeFileSync(join(project, "src", "components", "ContactCard", "index.js"), "export * from './_ContactCard.jsx';\n");
writeFileSync(join(project, "src", "components", "ContactCard", "_ContactCard.jsx"), "const a = 1;\nconst b = 2;\n");

const { snapshotProject } = await import("../../../src/core/session/_snapshot.js");
const snapshot = snapshotProject(project);

const { computeKpi } = await import("../../../src/core/telemetry/kpi/index.js");
const kpi = computeKpi({
  events: readEvents(),
  usage: { ...piUsage, agent: "pi", userTurns: 0 },
  project: snapshot,
  now: T0 + 400_000,
});

check("F6 the server's own output is counted in tokens", kpi.mcp.resultTokens === 8000);
check("F6.1 the arguments it received are counted too", kpi.mcp.argsTokens === 39);
check(
  "F6.2 the server's share of the model's context is a ratio, not a guess",
  Math.abs(kpi.mcp.shareOfLlmTokens - 8000 / (piUsage.input + piUsage.output + piUsage.cacheRead + piUsage.cacheWrite)) < 1e-9,
);
check(
  "F6.3 the measured saving stays separate from the routing estimate",
  // 600 of compression. The 1000 the cache replayed is output the model still
  // reads, so it is reported under cache, not added here (ADR 079).
  kpi.tokens.measuredSaved === 600 && kpi.tokens.estimatedRouting === 12_000,
);
check("F6.3.1 what the cache replayed is reported as replayed output", kpi.cache.replayedTokens === 1000);
check("F6.4 caveman's compression is a measured ratio", Math.abs(kpi.tokens.cavemanRatio - 0.25) < 1e-9);
check(
  "F6.4.1 a result the reminder grew reports no compression and names the overhead",
  (() => {
    // finalizeResult appends the workflow reminder, so the result that leaves
    // the server is routinely LARGER than the core it was built from. Reported
    // as a negative compression, that reads as caveman having made things
    // worse; it is the reminder's own cost and belongs in its own field.
    const grown = computeKpi({
      events: [{ ts: T0, session: "s", tool: "pix_tool", coreTokens: 100, finalTokens: 130 }],
    });

    return grown.tokens.cavemanRatio === 0 && grown.tokens.reminderOverhead === 30;
  })(),
);
check("F6.5 guardrail failures are attributed to rules", kpi.guardrails.byRule["no-css-classes"] === 2);
check("F6.6 the cache reports which tier answered", kpi.cache.byTier.exact === 1);
check("F6.7 resource reads are separated from tool calls", kpi.calls.resources === 1);
check("F6.8 an idle gap starts a new user iteration", kpi.iterations.count === 3);
check("F6.9 an inferred iteration count says it is inferred", kpi.iterations.estimated === true);
check("F6.10 a transcript overrides the inference with the real count", computeKpi({ events: readEvents(), usage: { ...piUsage, userTurns: 1 } }).iterations.estimated === false);
check("F6.11 lines per user prompt is reported", kpi.productivity.linesPerPrompt > 0);
check("F6.12 cost per thousand output tokens is reported", kpi.productivity.costPer1kOutput > 0);
check("F6.13 the session's active time is measured", kpi.productivity.activeMs === 299_900);

finish();
