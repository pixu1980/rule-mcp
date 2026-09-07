/** The store: rollup, retention, the size cap, and where the files live. */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { check, finish, projectDir, seedEvents, DAY, T0, recorder, store } from "./_telemetry.fixture.mjs";

const { DAY_MS, RAW_RETENTION_DAYS } = recorder;
const { eventsFile, purge, readEvents, readRollups, rollup, stateSize } = store;

console.log("=== Telemetry: store ===\n");

seedEvents();

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

// The recording is filed per project under the home directory, never inside the
// project: nothing this server writes needs a rule in somebody's .gitignore
// (ADR 082).
const { getProjectPaths } = await import("../../../src/cli/paths/index.js");
const projectStateDir = getProjectPaths(projectDir).dir;
check("T10 the events file lives in this project's own directory", eventsFile().startsWith(projectStateDir));
check(
  "T10.1 rollups live beside it",
  existsSync(projectStateDir) && readdirSync(projectStateDir).some((f) => f.includes("rollup")),
);
check("T10.2 that directory is under the home directory", !projectStateDir.startsWith(projectDir));
check("T10.3 and the project itself is untouched", !existsSync(join(projectDir, ".rule-mcp")));

finish();
