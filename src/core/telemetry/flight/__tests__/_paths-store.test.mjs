/**
 * @module test/flight-recorder/paths-store
 *
 * F1/F2: one home directory, one project directory, a project-scoped log.
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { makeCheck, makeSandbox } from "./_flight.fixture.mjs";

const { check, finish } = makeCheck("Flight recorder: paths and store");
const { workspace, project } = makeSandbox();
const home = homedir();

const { getProjectPaths, getRuntimePaths } = await import("../../../../cli/paths/index.js");

// ── F1: one home directory, one project directory ──
const paths = getRuntimePaths();

check("F1 state lives under the state dir/state", paths.stateDir === join(home, ".rule-mcp", "state"));
check("F1.1 data lives beside it", paths.dataDir === join(home, ".rule-mcp", "data"));
check("F1.2 config lives beside it", paths.configDir === join(home, ".rule-mcp", "config"));
check(
  "F1.3 the state override still works",
  (() => {
    process.env.RULE_MCP_STATE_DIR = workspace;
    const overridden = getRuntimePaths().stateDir === workspace;

    delete process.env.RULE_MCP_STATE_DIR;

    return overridden;
  })(),
);

const projectPaths = getProjectPaths(join(project, "src", "deep"));

check("F1.4 the project root is the repository root", projectPaths.projectDir === project);
// A recording is filed per project under the home directory (ADR 082).
check("F1.5 project data lives under the install, not the project", !projectPaths.dir.startsWith(project));
check("F1.6 exports live under it", projectPaths.exportsDir === join(projectPaths.dir, "exports"));
check("F1.7 the project itself is left alone", !existsSync(join(project, ".rule-mcp")));

// ── F2: the log is project-scoped ──
const { eventsFile, rollupFile } = await import("../../store/index.js");

check("F2 the event log is in the project directory", eventsFile() === join(projectPaths.dir, "telemetry.jsonl"));
check("F2.1 the rollup is beside it", rollupFile() === join(projectPaths.dir, "telemetry-rollup.json"));

finish();
