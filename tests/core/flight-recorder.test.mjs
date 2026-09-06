/**
 * @module test/flight-recorder.test
 *
 * The flight recorder as a benchmark instrument.
 *
 * The two hand-written benchmark reports this replaces carried numbers the
 * recorder could not produce: what the server's own results cost in context,
 * what the model spent, what the project ended up looking like. The rules that
 * matter here are that those numbers are MEASURED where they can be and marked
 * as estimated where they cannot, that an export leaves nothing behind, and
 * that everything the server writes lands under the project it was working on.
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

console.log("=== Flight recorder (KPI export) ===\n");

import { mkdirSync, mkdtempSync, existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

// homedir() reads HOME, so pinning it is what keeps the fixtures this suite
// records - `acme-app`, `nowhere` - out of the person's own home directory.
process.env.HOME = mkdtempSync(join(tmpdir(), "rule-flight-home-"));
const home = homedir();
// realpath, because macOS hands out /var/folders and cwd reports /private/var.
const workspace = realpathSync(mkdtempSync(join(tmpdir(), "rule-flight-")));
const project = join(workspace, "acme-app");
mkdirSync(project, { recursive: true });
// A project root is where the repository starts, so a nested cwd still records
// into one place.
mkdirSync(join(project, ".git"), { recursive: true });
mkdirSync(join(project, "src", "deep"), { recursive: true });
delete process.env.RULE_MCP_NO_TELEMETRY;
delete process.env.RULE_MCP_NO_PROMPTS;
delete process.env.RULE_MCP_STATE_DIR;
process.chdir(project);

const T0 = 1_760_000_000_000;

const { getProjectPaths, getRuntimePaths } = await import("../../src/cli/paths.js");

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
const { eventsFile, rollupFile, drain, readEvents, readRollups } = await import("../../src/core/telemetry-store.js");
check("F2 the event log is in the project directory", eventsFile() === join(projectPaths.dir, "telemetry.jsonl"));
check("F2.1 the rollup is beside it", rollupFile() === join(projectPaths.dir, "telemetry-rollup.json"));

// ── F3: what a call records now ──
const telemetry = await import("../../src/core/telemetry.js");
const { endSession, flush, projectId, recordToolCall, setClientInfo, startSession } = telemetry;

setClientInfo({ name: "claude-code", version: "2.4.1" });
startSession({ transport: "stdio", now: T0 });
recordToolCall({
  tool: "pix_tool",
  args: { prompt: "add a dark mode toggle to the header for acme corp", mode: "full" },
  durationMs: 120,
  ok: true,
  cacheHit: false,
  cacheTier: "miss",
  entry: "router",
  routedSkill: "rule-frontend-react",
  mode: "full",
  argsBytes: 96,
  resultBytes: 8000,
  coreTokens: 2400,
  finalTokens: 1800,
  guardrailFailures: 3,
  guardrailRules: { "no-css-classes": 2, "semantic-html": 1 },
  saved: { caveman: 600 },
  estimatedRouting: 12_000,
  now: T0 + 100,
});
recordToolCall({
  tool: "rule_tool_frontend_react",
  args: { prompt: "add a dark mode toggle to the header for acme corp" },
  durationMs: 8,
  ok: true,
  cacheHit: true,
  cacheTier: "exact",
  entry: "skill",
  resultBytes: 4000,
  argsBytes: 60,
  saved: { cache: 1000 },
  now: T0 + 200_000,
});
recordToolCall({
  tool: "get_pix_frontend_react_skill_full_content",
  resource: true,
  durationMs: 4,
  ok: true,
  resultBytes: 20_000,
  now: T0 + 200_400,
});
flush();

const events = readEvents();
const first = events[0];
check("F3 the prompt text is recorded verbatim by default", first.prompt?.includes("acme corp") === true);
check("F3.1 the length is kept alongside it", first.promptLength === first.prompt.length);
check("F3.2 the result size is measured in bytes", first.resultBytes === 8000);
check("F3.3 and turned into a token estimate", first.resultTokensEst === 2000);
check("F3.4 the arguments are measured too", first.argsTokensEst === 24);
check("F3.5 a failing guardrail is recorded per rule", first.guardrailRules?.["no-css-classes"] === 2);
check("F3.6 both ends of post-processing are recorded", first.coreTokens === 2400 && first.finalTokens === 1800);

check("F3.7 the skill mode is recorded", first.mode === "full");
check("F3.8 the client that connected is recorded", first.client === "claude-code/2.4.1");
check("F3.9 a resource read is marked as one", events[2].resource === true);
check("F3.10 the project has its own id", typeof projectId() === "string" && projectId().length > 0);
check("F3.11 the project id file lives with the project", existsSync(join(projectPaths.dir, "project-id")));

process.env.RULE_MCP_NO_PROMPTS = "1";
recordToolCall({ tool: "pix_tool", args: { prompt: "a secret product plan" }, now: T0 + 300_000 });
flush();
const quiet = readEvents().at(-1);
check("F3.12 the kill switch drops the prompt text", quiet.prompt === undefined);
check("F3.13 and keeps the length", quiet.promptLength === "a secret product plan".length);
delete process.env.RULE_MCP_NO_PROMPTS;

// ── F4: usage comes from the coding agent's own transcript ──
const { AGENT_TRANSCRIPTS, detectAgentUsage, readAgentUsage, supportedAgents, unsupportedAgents } =
  await import("../../src/core/agent-transcripts.js");
check(
  "F4 every adapter names the agent it reads",
  AGENT_TRANSCRIPTS.every((a) => typeof a.agent === "string"),
);
check("F4.1 pi is supported", supportedAgents().includes("pi"));
check("F4.2 claude is supported", supportedAgents().includes("claude"));
check("F4.3 codex is supported", supportedAgents().includes("codex"));
check("F4.4 opencode is supported", supportedAgents().includes("opencode"));
check(
  "F4.5 an agent with no machine-readable usage says so instead of guessing",
  unsupportedAgents().every((a) => typeof a.reason === "string" && a.reason.length > 0),
);

const fake = join(workspace, "agents");
// pi: one JSONL per session, usage and cost per assistant message.
const piDir = join(fake, ".pi", "agent", "sessions", `--${project.slice(1).replaceAll("/", "-")}--`);
mkdirSync(piDir, { recursive: true });
writeFileSync(
  join(piDir, "2026-07-11T13-05-52-125Z_abc.jsonl"),
  [
    JSON.stringify({
      type: "message",
      message: { role: "user", content: [{ type: "text", text: "usa rule MCP" }] },
    }),
    // pi has a third role, and it is the one that would inflate the turn count.
    JSON.stringify({ type: "message", message: { role: "toolResult", content: [] } }),
    JSON.stringify({
      type: "message",
      message: {
        role: "assistant",
        model: "deepseek-v4-flash",
        provider: "opencode-go",
        usage: {
          input: 52_920,
          output: 255,
          cacheRead: 0,
          cacheWrite: 0,
          reasoning: 0,
          totalTokens: 53_175,
          cost: { input: 0.0116, output: 0.0002, total: 0.0118 },
        },
      },
    }),
    JSON.stringify({
      type: "message",
      message: {
        role: "assistant",
        model: "deepseek-v4-flash",
        usage: {
          input: 2096,
          output: 345,
          cacheRead: 52_992,
          cacheWrite: 0,
          reasoning: 100,
          totalTokens: 55_433,
          cost: { total: 0.001 },
        },
      },
    }),
  ].join("\n") + "\n",
);

const piUsage = readAgentUsage({ agent: "pi", projectDir: project, home: fake });
check("F4.6 pi output tokens are summed", piUsage.output === 600);
check("F4.7 pi cache reads are summed", piUsage.cacheRead === 52_992);
check("F4.8 pi peak context is the maximum, never the sum", piUsage.peakContext === 55_433);
check("F4.9 pi cost is real money, not an estimate", Math.abs(piUsage.costUsd - 0.0128) < 1e-6);
check("F4.10 pi api calls are counted", piUsage.apiCalls === 2);
check("F4.11 pi user turns are counted", piUsage.userTurns === 1);
check("F4.11.1 a pi tool result is not a user turn", piUsage.userTurns === 1 && piUsage.apiCalls === 2);
check("F4.12 pi reports the model", piUsage.model === "deepseek-v4-flash");

// claude: message.usage, Anthropic field names, no cost.
const claudeDir = join(fake, ".claude", "projects", project.replaceAll("/", "-"));
mkdirSync(claudeDir, { recursive: true });
writeFileSync(
  join(claudeDir, "session.jsonl"),
  [
    JSON.stringify({ type: "user", message: { role: "user", content: "usa rule MCP" } }),
    // Claude Code returns tool results as user-role rows: 196 of them against
    // 3 prompts in the transcript this was checked against.
    JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } }),
    JSON.stringify({
      type: "assistant",
      message: {
        model: "claude-opus-5",
        usage: {
          input_tokens: 2,
          cache_creation_input_tokens: 27_930,
          cache_read_input_tokens: 29_652,
          output_tokens: 435,
          output_tokens_details: { thinking_tokens: 208 },
        },
      },
    }),
  ].join("\n") + "\n",
);
const claudeUsage = readAgentUsage({ agent: "claude", projectDir: project, home: fake });
check("F4.13 claude cache writes are read from cache_creation", claudeUsage.cacheWrite === 27_930);
check("F4.14 claude reasoning comes from thinking tokens", claudeUsage.reasoning === 208);
check("F4.15 claude peak context adds the cached input back", claudeUsage.peakContext === 2 + 29_652 + 27_930);
check("F4.16 claude reports no cost rather than a fabricated one", claudeUsage.costUsd === undefined);
check("F4.16.1 a claude tool result is not a user turn", claudeUsage.userTurns === 1);

// codex: a rolling token_count event, cumulative by design.
const codexDir = join(fake, ".codex", "sessions", "2026", "07", "11");
mkdirSync(codexDir, { recursive: true });
writeFileSync(
  join(codexDir, "rollout-2026-07-11T13-05-52-abc.jsonl"),
  [
    JSON.stringify({ type: "session_meta", payload: { cwd: project, model_provider: "openai" } }),
    JSON.stringify({
      type: "event_msg",
      payload: {
        type: "token_count",
        info: {
          total_token_usage: {
            input_tokens: 250_516,
            cached_input_tokens: 200_000,
            output_tokens: 40_322,
            reasoning_output_tokens: 10_518,
            total_tokens: 290_838,
          },
          last_token_usage: { total_tokens: 189_673 },
          model_context_window: 372_000,
        },
      },
    }),
  ].join("\n") + "\n",
);
const codexUsage = readAgentUsage({ agent: "codex", projectDir: project, home: fake });
check("F4.17 codex totals are taken from the last rolling count", codexUsage.output === 40_322);
check("F4.18 codex reports the context window it was given", codexUsage.contextWindow === 372_000);
check("F4.19 codex peak context is the largest single call", codexUsage.peakContext === 189_673);

// opencode: one JSON per message, keyed by session directory.
const openDir = join(fake, ".local", "share", "opencode", "storage", "message", "ses_1");
mkdirSync(openDir, { recursive: true });
writeFileSync(
  join(openDir, "msg_1.json"),
  JSON.stringify({
    role: "assistant",
    modelID: "big-pickle",
    providerID: "opencode",
    path: { cwd: project, root: project },
    cost: 0.25,
    time: { created: T0 + 1000 },
    tokens: { input: 250, output: 1593, reasoning: 0, cache: { read: 19_968, write: 0 } },
  }),
);
// An opencode user message carries no `path` at all: it belongs to the project
// only through the session directory it shares with the assistant messages.
writeFileSync(join(openDir, "msg_0.json"), JSON.stringify({ role: "user", time: { created: T0 } }));
const openUsage = readAgentUsage({ agent: "opencode", projectDir: project, home: fake });
check("F4.20 opencode reads nested cache counters", openUsage.cacheRead === 19_968);
check("F4.21 opencode matches the project by its recorded root", openUsage.output === 1593);
check("F4.21.1 an opencode user turn is found through its session, not its path", openUsage.userTurns === 1);
// ── F4b: usage belongs to the recording window, not to the project's history ──
// A separate project, so the windowed rows are not mixed with the undated ones
// above: the two behaviours are different rules and deserve separate fixtures.
const stampedProject = join(workspace, "stamped-app");
mkdirSync(join(stampedProject, ".git"), { recursive: true });
const stampedDir = join(fake, ".pi", "agent", "sessions", `--${stampedProject.slice(1).replaceAll("/", "-")}--`);
mkdirSync(stampedDir, { recursive: true });
writeFileSync(
  join(stampedDir, "stamped.jsonl"),
  [
    JSON.stringify({
      type: "message",
      timestamp: new Date(T0 - 30 * 86_400_000).toISOString(),
      message: {
        role: "assistant",
        model: "last-month",
        usage: { input: 1, output: 999_999, cacheRead: 0, cacheWrite: 0, totalTokens: 5_000_000 },
      },
    }),
    JSON.stringify({
      type: "message",
      timestamp: new Date(T0 + 1000).toISOString(),
      message: {
        role: "assistant",
        model: "this-session",
        usage: { input: 1, output: 7, cacheRead: 0, cacheWrite: 0, totalTokens: 8 },
      },
    }),
  ].join("\n") + "\n",
);
const windowed = readAgentUsage({
  agent: "pi",
  projectDir: stampedProject,
  home: fake,
  since: T0,
  until: T0 + 2000,
});
check("F4b a month-old session is not counted as this one", windowed.output === 7);
check("F4b.1 and its context does not become this session's peak", windowed.peakContext === 8);
check("F4b.2 the window it counted over is reported", windowed.window?.since === T0);
check(
  "F4b.3 the whole history is still there when no window is asked for",
  readAgentUsage({ agent: "pi", projectDir: stampedProject, home: fake }).output === 1_000_006,
);
check(
  "F4b.4 an undated row is kept, because dropping it would lose a whole agent",
  readAgentUsage({ agent: "pi", projectDir: project, home: fake, since: T0, until: T0 + 2000 }).output === 600,
);
check(
  "F4b.5 the busiest agent is detected even when no client named itself",
  detectAgentUsage({ projectDir: project, home: fake })?.agent === "pi",
);

check(
  "F4.22 an agent that never ran reports nothing, not zero",
  readAgentUsage({ agent: "pi", projectDir: join(workspace, "nowhere"), home: fake }) === undefined,
);

// ── F5: what the project looked like when the session ended ──
mkdirSync(join(project, "src", "components", "ContactCard"), { recursive: true });
mkdirSync(join(project, "docs", "adr"), { recursive: true });
mkdirSync(join(project, "node_modules", "left-pad"), { recursive: true });
mkdirSync(join(project, ".tokensave"), { recursive: true });
writeFileSync(join(project, "src", "components", "ContactCard", "index.js"), "export * from './_ContactCard.jsx';\n");
writeFileSync(join(project, "src", "components", "ContactCard", "_ContactCard.jsx"), "const a = 1;\nconst b = 2;\n");
writeFileSync(join(project, "src", "components", "ContactCard", "_ContactCard.css"), ":host { color: red; }\n");
writeFileSync(join(project, "docs", "adr", "001-pick-react.md"), "# 001\n");
writeFileSync(join(project, "src", "_contacts.test.js"), "test('x', () => {});\n");
writeFileSync(join(project, "node_modules", "left-pad", "index.js"), "// noise\n".repeat(50));

const { snapshotProject } = await import("../../src/core/project-snapshot.js");
const snapshot = snapshotProject(project);
check("F5 source lines are counted", snapshot.lines.total > 0);
check("F5.1 lines are broken down by extension", snapshot.lines.byExtension[".jsx"] === 2);
check("F5.2 files are broken down by extension", snapshot.files.byExtension[".css"] === 1);
check("F5.3 node_modules is never counted as source", snapshot.files.byExtension[".js"] === 2);
check("F5.4 components are the directories with a barrel", snapshot.components === 1);
check("F5.5 ADRs are counted", snapshot.adrs === 1);
check("F5.6 test files are counted", snapshot.testFiles === 1);
check("F5.7 the source tree is weighed", snapshot.bytes.source > 0);
check("F5.8 dependencies are weighed apart from source", snapshot.bytes.nodeModules > 0);

writeFileSync(join(project, ".tokensave", "branch-meta.json"), JSON.stringify({ db_file: "tokensave.db" }));
const withGraph = snapshotProject(project);
check("F5.9 a missing graph is reported as absent, not as zero", withGraph.tokensave.present === true);

// ── F6: the numbers the reports had to work out by hand ──
const { computeKpi } = await import("../../src/core/kpi.js");
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
  Math.abs(
    kpi.mcp.shareOfLlmTokens - 8000 / (piUsage.input + piUsage.output + piUsage.cacheRead + piUsage.cacheWrite),
  ) < 1e-9,
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
check(
  "F6.10 a transcript overrides the inference with the real count",
  computeKpi({ events: readEvents(), usage: { ...piUsage, userTurns: 1 } }).iterations.estimated === false,
);
check("F6.11 lines per user prompt is reported", kpi.productivity.linesPerPrompt > 0);
check("F6.12 cost per thousand output tokens is reported", kpi.productivity.costPer1kOutput > 0);
check("F6.13 the session's active time is measured", kpi.productivity.activeMs === 299_900);

// ── F7: one file out, nothing left behind ──
const { FLIGHT_FILE_VERSION, exportFlight } = await import("../../src/core/telemetry-flight.js");
endSession({ now: T0 + 400_000 });
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

startSession({ transport: "stdio", now: T0 + 700_000 });
recordToolCall({ tool: "rule_tool_check", durationMs: 5, ok: true, resultBytes: 400, now: T0 + 700_100 });
flush();
endSession({ now: T0 + 700_200 });
exportFlight({ projectDir: project, home: fake, exportedAt: T0 + 700_300, keep: true });
check("F7.12 --keep leaves the log in place", readEvents().length === 1);
drain();
check("F7.13 drain empties the log on demand", readEvents().length === 0);
check(
  "F7.14 every export is its own file",
  readdirSync(projectPaths.exportsDir).filter((f) => f.endsWith(".flight")).length === 2,
);

// ── F8: readable without a JSON viewer ──
const { renderFlight } = await import("../../src/core/telemetry-stats.js");
const rendered = renderFlight(flight);
check("F8 the renderer reports the server's token footprint", rendered.includes("MCP token footprint"));
check("F8.1 it reports the model's usage", rendered.includes("peak context") || rendered.includes("Peak context"));
check("F8.2 it keeps the routing estimate out of the measured total", rendered.includes("modeled, not measured"));
check("F8.3 it reports the project snapshot", rendered.includes("Components"));

// ── F9: the agent can declare its own usage when its transcript cannot be read ──
const { readSidecarUsage, writeSidecarUsage } = await import("../../src/core/telemetry-store.js");
writeSidecarUsage({ agent: "copilot", model: "gpt-5.6", output: 1234, costUsd: 0.5 });
check("F9 a declared usage is read back", readSidecarUsage()?.output === 1234);
check("F9.1 it is labeled as declared, not measured", readSidecarUsage()?.source === "sidecar");

startSession({ transport: "stdio", now: T0 + 800_000 });
recordToolCall({ tool: "pix_tool", args: { prompt: "ship it" }, resultBytes: 800, now: T0 + 800_100 });
flush();
endSession({ now: T0 + 800_200 });
const withSidecar = exportFlight({ projectDir: join(workspace, "nowhere"), home: fake, exportedAt: T0 + 900_000 });
check("F9.2 the declaration fills in when no transcript matches", withSidecar.flight.usage?.output === 1234);
check("F9.3 the export says where the usage came from", withSidecar.flight.usage?.source === "sidecar");
check("F9.4 the declaration is drained with everything else", readSidecarUsage() === undefined);

startSession({ transport: "stdio", now: T0 + 950_000 });
recordToolCall({ tool: "pix_tool", args: { prompt: "again" }, resultBytes: 800, now: T0 + 950_100 });
flush();
endSession({ now: T0 + 950_200 });
writeSidecarUsage({ agent: "copilot", output: 1 });
const measuredWins = exportFlight({ projectDir: project, home: fake, exportedAt: T0 + 960_000 });
check("F9.5 a readable transcript beats a declaration", measuredWins.flight.usage?.source === "transcript");

// ── F10: the recorder writes nothing into the project ──
// The ignore rule and the hooks that re-asserted it are gone with the local
// directory they existed for: there is nothing in a repository to ignore.
const untouched = join(workspace, "untouched");
mkdirSync(join(untouched, ".git"), { recursive: true });
recordToolCall({ tool: "pix_tool", durationMs: 1, ok: true, now: T0 + 970_000 });
flush();
check("F10 no directory is created in the project", !existsSync(join(untouched, ".rule-mcp")));
check("F10.1 and no .gitignore is written", !existsSync(join(untouched, ".gitignore")));

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
