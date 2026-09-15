

/**
 * Hardening 4.3: does text compression actually save anything?
 *
 * Every flight export said `measuredSaved: 0` with `savedBySource.compression: 0`,
 * which left two possibilities: the compressor was not running where it
 * mattered, or its savings were a story. This suite settles it on a corpus of
 * real tool results rather than on invented prose, and pins the two claims that
 * have to hold together: compression removes something measurable, and what it
 * removes is never substance.
 *
 * The recorder is the third case. The number it books has to be what the
 * compression step removed, not what survives after the workflow reminder is
 * added on top of it - netting the two was what produced the zero.
 */
import { mkdirSync, mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const stateDir = mkdtempSync(join(tmpdir(), "rule-compression-eval-"));
const projectDir = realpathSync(mkdtempSync(join(tmpdir(), "rule-compression-project-")));
mkdirSync(join(projectDir, ".git"), { recursive: true });
process.env.RULE_MCP_STATE_DIR = stateDir;
process.env.RULE_MCP_NO_CACHE = "1";
process.env.RULE_MCP_NO_AUTOUPDATE = "1";
delete process.env.RULE_MCP_NO_TELEMETRY;
delete process.env.RULE_MCP_NO_COMPRESSION;

export const { compressResult } = await import("../_compression.js");
const { loadAllSkills } = await import("../../skills/index.js");
export const { callTool, recomputeCore } = await import("../../../tools/router/index.js");
export const { flush } = await import("../../telemetry/recorder/index.js");
export const { readEvents } = await import("../../telemetry/store/index.js");

/**
 * Real results, not fixtures: the corpus is what this server actually returns.
 * Skill bodies are the prose-heavy end, the router payload is the data end.
 */
export const CORPUS = [
  ["pix_tool", { prompt: "React accessible form with validation" }],
  ["rule_tool_frontend_react", {}],
  ["rule_tool_styleguide_css", {}],
  ["rule_tool_backend_node", {}],
  ["rule_tool_process_code_review", {}],
  ["rule_tool_compression", {}],
];

export const text = (result) => (result?.content ?? []).map((item) => item.text ?? "").join("");
export const tokens = (result) => Math.ceil(text(result).length / 4);

await loadAllSkills();

/** The corpus computed once: what the server actually returns, raw and compressed. */
export const results = [];

for (const [name, args] of CORPUS) {
  const core = await recomputeCore(name, args);
  results.push({ name, core, compressed: compressResult(core) });
}

export { projectDir, stateDir };
