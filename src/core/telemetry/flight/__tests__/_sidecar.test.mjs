/**
 * @module test/flight-recorder/sidecar
 *
 * F9/F10: the agent can declare its own usage when its transcript cannot be
 * read, and the recorder writes nothing into the project.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { makeCheck, makeSandbox, recordSampleSession, writePiFixture, T0 } from "./_flight.fixture.mjs";

const { check, finish } = makeCheck("Flight recorder: sidecar and no-write");
const { workspace, project } = makeSandbox();

const { readSidecarUsage, writeSidecarUsage, readEvents } = await import("../../store/index.js");
const telemetry = await import("../../recorder/index.js");
const { exportFlight } = await import("../index.js");

recordSampleSession(telemetry);

const fake = writePiFixture(workspace, project);

writeSidecarUsage({ agent: "copilot", model: "gpt-5.6", output: 1234, costUsd: 0.5 });
check("F9 a declared usage is read back", readSidecarUsage()?.output === 1234);
check("F9.1 it is labeled as declared, not measured", readSidecarUsage()?.source === "sidecar");

telemetry.startSession({ transport: "stdio", now: T0 + 800_000 });
telemetry.recordToolCall({ tool: "pix_tool", args: { prompt: "ship it" }, resultBytes: 800, now: T0 + 800_100 });
telemetry.flush();
telemetry.endSession({ now: T0 + 800_200 });

const withSidecar = exportFlight({ projectDir: join(workspace, "nowhere"), home: fake, exportedAt: T0 + 900_000 });

check("F9.2 the declaration fills in when no transcript matches", withSidecar.flight.usage?.output === 1234);
check("F9.3 the export says where the usage came from", withSidecar.flight.usage?.source === "sidecar");
check("F9.4 the declaration is drained with everything else", readSidecarUsage() === undefined);

telemetry.startSession({ transport: "stdio", now: T0 + 950_000 });
telemetry.recordToolCall({ tool: "pix_tool", args: { prompt: "again" }, resultBytes: 800, now: T0 + 950_100 });
telemetry.flush();
telemetry.endSession({ now: T0 + 950_200 });
writeSidecarUsage({ agent: "copilot", output: 1 });

const measuredWins = exportFlight({ projectDir: project, home: fake, exportedAt: T0 + 960_000 });

check("F9.5 a readable transcript beats a declaration", measuredWins.flight.usage?.source === "transcript");

// ── F10: the recorder writes nothing into the project ──
// The ignore rule and the hooks that re-asserted it are gone with the local
// directory they existed for: there is nothing in a repository to ignore.
const untouched = join(workspace, "untouched");

mkdirSync(join(untouched, ".git"), { recursive: true });
telemetry.recordToolCall({ tool: "pix_tool", durationMs: 1, ok: true, now: T0 + 970_000 });
telemetry.flush();
check("F10 no directory is created in the project", !existsSync(join(untouched, ".rule-mcp")));
check("F10.1 and no .gitignore is written", !existsSync(join(untouched, ".gitignore")));
check("F10.2 the log still recorded the call", readEvents().length > 0);

finish();
