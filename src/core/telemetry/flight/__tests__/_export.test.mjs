

/**
 * @module test/flight-recorder/export
 *
 * F7/F8: one file out, nothing left behind - and readable without a JSON
 * viewer.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeCheck, makeSandbox, recordSampleSession, writePiFixture, T0 } from "./_flight.fixture.mjs";

const { check, finish } = makeCheck("Flight recorder: export");
const { workspace, project } = makeSandbox();

const { getProjectPaths } = await import("../../../../cli/paths/index.js");
const { drain, readEvents, readRollups } = await import("../../store/index.js");
const telemetry = await import("../../recorder/index.js");

recordSampleSession(telemetry);

const fake = writePiFixture(workspace, project);
const projectPaths = getProjectPaths(project);

// A component, so the exported snapshot has something to carry.
mkdirSync(join(project, "src", "components", "ContactCard"), { recursive: true });
writeFileSync(join(project, "src", "components", "ContactCard", "index.js"), 'export * from "./_ContactCard.jsx";\n');
writeFileSync(join(project, "src", "components", "ContactCard", "_ContactCard.jsx"), "const a = 1;\n");

const { FLIGHT_FILE_VERSION, exportFlight } = await import("../index.js");

telemetry.endSession({ now: T0 + 400_000 });

const exported = exportFlight({ projectDir: project, home: fake, exportedAt: T0 + 500_000 });

check("F7 the export is a single file", typeof exported.file === "string" && exported.file.endsWith(".flight"));
check("F7.1 it is written under the project's exports directory", exported.file.startsWith(projectPaths.exportsDir));

const flight = JSON.parse(readFileSync(exported.file, "utf8"));

check("F7.2 the envelope is version 2", flight.version === FLIGHT_FILE_VERSION && FLIGHT_FILE_VERSION === "2");
check(
  "F7.3 it still carries a replayable timeline",
  flight.session.events.some((e) => e.type === "mcp-tool-call"),
);
check("F7.4 it carries the KPI block", typeof flight.kpi?.mcp?.resultTokens === "number");
check("F7.5 it carries the model's usage", flight.usage?.output > 0);
check("F7.5.1 and says which window it was counted over", flight.usage.window?.since > 0);
check("F7.6 it carries the project snapshot", flight.project?.components === 1);
check(
  "F7.7 it carries the prompts that were recorded",
  flight.prompts.some((p) => p.text?.includes("acme corp")),
);
check("F7.8 the raw log is empty afterwards", readEvents().length === 0);
check("F7.9 the rollup is emptied too", readRollups().length === 0);
check("F7.10 the project id is reset", !existsSync(join(projectPaths.dir, "project-id")));
check(
  "F7.11 exporting nothing is an error, not an empty file",
  (() => {
    try {
      exportFlight({ projectDir: project, home: fake, exportedAt: T0 + 600_000 });

      return false;
    } catch {
      return true;
    }
  })(),
);

telemetry.startSession({ transport: "stdio", now: T0 + 700_000 });
telemetry.recordToolCall({ tool: "rule_tool_check", durationMs: 5, ok: true, resultBytes: 400, now: T0 + 700_100 });
telemetry.flush();
telemetry.endSession({ now: T0 + 700_200 });
exportFlight({ projectDir: project, home: fake, exportedAt: T0 + 700_300, keep: true });
check("F7.12 --keep leaves the log in place", readEvents().length === 1);
drain();
check("F7.13 drain empties the log on demand", readEvents().length === 0);
check("F7.14 every export is its own file", readdirSync(projectPaths.exportsDir).filter((f) => f.endsWith(".flight")).length === 2);

// ── F8: readable without a JSON viewer ──
const { renderFlight } = await import("../../stats/index.js");
const rendered = renderFlight(flight);

check("F8 the renderer reports the server's token footprint", rendered.includes("MCP token footprint"));
check("F8.1 it reports the model's usage", rendered.includes("peak context") || rendered.includes("Peak context"));
check("F8.2 it keeps the routing estimate out of the measured total", rendered.includes("modeled, not measured"));
check("F8.3 it reports the project snapshot", rendered.includes("Components"));

finish();
