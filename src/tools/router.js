/**
 * @module tools/router
 *
 * Central tool registry for the rule-mcp server.
 * Provides low-level tool registration, listing, execution, and skill file access.
 *
 * Higher-level registration functions (registerAiTool, registerSkillTool, etc.)
 * live in `core/skills.js` which imports from this module.
 *
 * @see module:core/skills
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod/v4";
import { getSkillsDirs as getSkillsDirectories } from "../cli/paths.js";
import { parseSkillFrontmatter } from "../core/skill-frontmatter.js";
import {
  decorateWorkflowReminder,
  enforcementError,
  postprocessToolResult,
  preprocessToolCall,
  stampRequestId,
} from "../core/enforcement.js";
import { cacheLookup, cacheStore, skillDigest } from "../core/tool-cache.js";
import { compressResult } from "../core/caveman.js";
import { alignAsciiBoxesResult } from "../core/ascii-box.js";
import { stripFingerprintResult } from "../core/fingerprint.js";
import { recordToolCall } from "../core/telemetry.js";
import { consumeUpdateBanner, maybeSelfUpdate } from "../core/self-update.js";
import { resumeAnnouncement } from "../core/resume.js";
import { touchActivity } from "../core/reclaim.js";

/** Prepend a self-update banner (if any) to a result so the update is visible. */
function withBanner(banner, result) {
  if (!banner || !result || !Array.isArray(result.content)) {
    return result;
  }
  return { ...result, content: [{ type: "text", text: banner }, ...result.content] };
}

/**
 * Apply env/state-dependent decoration to a deterministic result core: the
 * workflow reminder (process state + opt-out), then caveman compression, then
 * fingerprint removal, then box alignment (both opt-out). Runs on BOTH cache
 * hits and fresh computes so those toggles always take effect and are never
 * frozen into the cache.
 *
 * Order matters: compression rewrites prose, so the fingerprint pass runs after
 * it and cleans whatever the compressor left behind. Box alignment is last of
 * all - it counts columns, so it has to see the final characters.
 *
 * Both effects are measured at the step that causes them. Reading either as
 * core-minus-final nets them against each other (ADR 074).
 *
 * @param {string} name
 * @param {object} core
 * @returns {{ final: object, cavemanSaved: number, reminderTokens: number }}
 */
function finalize(name, core) {
  const reminded = decorateWorkflowReminder(name, core);
  const compressed = compressResult(reminded);

  return {
    final: stampRequestId(alignAsciiBoxesResult(stripFingerprintResult(compressed))),
    cavemanSaved: Math.max(0, estimateTokens(reminded) - estimateTokens(compressed)),
    reminderTokens: Math.max(0, estimateTokens(reminded) - estimateTokens(core)),
  };
}

/**
 * Rough token count, the char/4 heuristic used everywhere in this project.
 * Every number derived from it is rendered with a tilde for that reason.
 *
 * @param {object} result
 * @returns {number}
 */
function estimateTokens(result) {
  return Math.ceil(textBytes(result) / 4);
}

/** How many characters of text a result actually carries. */
function textBytes(result) {
  return (result?.content ?? []).map((item) => item.text ?? "").join("").length;
}

/** @param {object} args @returns {number} the size of what the caller sent */
function argsBytes(args) {
  try {
    return args === undefined ? 0 : JSON.stringify(args).length;
  } catch {
    return 0;
  }
}

/**
 * Which guardrails failed, as rule id to failure count.
 *
 * @param {object} result
 * @returns {Record<string, number>|undefined}
 */
function guardrailRulesOf(result) {
  const failed = result?._meta?.pixGuardrails?.failed;

  if (!Array.isArray(failed) || failed.length === 0) {
    return;
  }

  return Object.fromEntries(failed.map((rule) => [rule.id, Number(rule.failCount) || 1]));
}

/**
 * Tools that read no skill file, so no skill edit can invalidate their answer.
 *
 * An explicit list, and short. Everything not named here either declares its
 * dependencies below or is treated as depending on all of them, so the failure
 * mode of getting this wrong is invalidating too much - which is what the cache
 * does for every entry it cannot narrow - and never serving a stale answer.
 */
const SKILL_INDEPENDENT = new Set([
  "rule_tool_component", // templates.js
  "rule_tool_compress", // pure text transformation
  "rule_tool_a11y_report", // vendored WCAG criteria
  "rule_tool_stats", // the telemetry log
]);

/**
 * How a call arrived: through the router, through the gateway, straight at a
 * skill tool, or at an action tool.
 *
 * Derived from the name alone, so it costs nothing and cannot drift.
 *
 * @param {string} name
 * @returns {"router"|"gateway"|"skill"|"action"}
 */
export function entryPathOf(name) {
  if (name === "pix_tool") {
    return "router";
  }

  if (name === "rule_tool_gateway") {
    return "gateway";
  }

  const directory = `rule-${name.replace(/^rule_tool_/, "").replaceAll("_", "-")}`;

  return getSkillNames().includes(directory) ? "skill" : "action";
}

/**
 * Which skills produced this answer, and what their content was at the time.
 *
 * The recorded digests are what let one skill edit drop its dependents and
 * leave the rest of the cache alone. Three cases are attributable and the rest
 * are not, deliberately:
 *
 *   - the router names the route it chose and the alternatives it offered;
 *   - a skill tool is its own skill;
 *   - a check is the skill it checked.
 *
 * Everything else gets every skill, because a full-text search really does
 * depend on the whole corpus and because a wrong guess here is the one failure
 * that would show up as a stale answer.
 *
 * @param {string} name
 * @param {object} args
 * @param {object} result the deterministic core
 * @returns {Record<string, string>} skill name -> digest
 */
export function dependenciesOf(name, args, result) {
  if (SKILL_INDEPENDENT.has(name)) {
    return {};
  }

  const withDigests = (names) => {
    const out = {};

    for (const skill of names) {
      const digest = skillDigest(skill);

      if (digest) {
        out[skill] = digest;
      }
    }

    return out;
  };

  if (name === "pix_tool") {
    const named = new Set();
    try {
      const answer = JSON.parse(result?.content?.[0]?.text ?? "{}");

      if (answer.route) {
        named.add(answer.route);
      }

      for (const alternative of answer.alternatives ?? []) {
        if (alternative?.route) {
          named.add(alternative.route);
        }
      }
    } catch {
      /* not JSON: fall through to the conservative answer */
    }

    if (named.size > 0) {
      return withDigests(named);
    }
  }

  if (entryPathOf(name) === "skill") {
    return withDigests([`rule-${name.replace(/^rule_tool_/, "").replaceAll("_", "-")}`]);
  }

  if (name === "rule_tool_check" && typeof args?.skill === "string") {
    const declared = withDigests([args.skill]);

    if (Object.keys(declared).length > 0) {
      return declared;
    }
  }

  return withDigests(getSkillNames());
}

/**
 * The skill a routing result chose, for the per-skill counts. Only the router
 * answers this; every other tool returns undefined and is counted by name.
 *
 * @param {string} name
 * @param {object} result
 * @returns {string|undefined}
 */
function routedSkillOf(name, result) {
  if (name !== "pix_tool") {
    return;
  }

  try {
    const parsed = JSON.parse(result?.content?.[0]?.text ?? "{}");

    return typeof parsed.route === "string" && parsed.route !== "none" ? parsed.route : undefined;
  } catch {
    return;
  }
}

/**
 * What reading the whole skill file would have cost, minus what routing
 * actually returned. A model of an alternative that did not happen, which is
 * why it is kept in its own field and never added to a measured total.
 *
 * @param {string} name
 * @param {object} core
 * @param {object} final
 * @returns {number|undefined}
 */
function estimateRoutingSaving(name, core, final) {
  if (name !== "pix_tool") {
    return;
  }

  const route = routedSkillOf(name, core);

  if (!route) {
    return;
  }

  const full = readSkill(route);

  if (!full) {
    return;
  }

  return Math.max(0, Math.ceil(full.length / 4) - estimateTokens(final));
}

/**
 * Run a tool and return its deterministic core, the value the cache stores.
 *
 * Everything after this point is decoration that depends on when and where the
 * call happened: the reminder's once-then-terse state, compression, fingerprint
 * removal, an update banner. The core is what two runs of the same call must
 * agree on, which is why `cache verify` compares this and not the final result.
 *
 * @param {string} name
 * @param {object} tool - The registered tool.
 * @param {object} validated - Arguments after schema validation.
 * @returns {Promise<{ arguments: object, core: object }>}
 */
async function computeCore(name, tool, validated) {
  let processedArguments = preprocessToolCall(name, validated);
  const beforeHooks = [...(_beforeHooks["*"] || []), ...(_beforeHooks[name] || [])];

  for (const function_ of beforeHooks) {
    processedArguments = (await function_(name, processedArguments, tool)) ?? processedArguments;
  }

  let result = await tool.handler(processedArguments);

  const postHooks = [...(_postHooks["*"] || []), ...(_postHooks[name] || [])];

  for (const function_ of postHooks) {
    result = (await function_(name, processedArguments, result, tool)) ?? result;
  }

  return {
    arguments: processedArguments,
    core: postprocessToolResult(name, processedArguments, result, {
      toolNames: _tools.map((item) => item.name),
      skillNames: getSkillNames(),
    }),
  };
}

/**
 * Recompute a call without consulting or writing the cache.
 *
 * `cache verify` and `cache export` exist to check that a stored answer still
 * reproduces, so a recompute served from the cache would confirm only that the
 * cache agrees with itself.
 *
 * @param {string} name
 * @param {object} args
 * @returns {Promise<object>} the deterministic core
 */
export async function recomputeCore(name, args) {
  const tool = _tools.find((item) => item.name === name);

  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  const validated = tool.zodSchema ? tool.zodSchema.parse(args) : args;

  return (await computeCore(name, tool, validated)).core;
}

/** Internal list of registered tool definitions. */
const _tools = [];

/** Mandatory before-tool hooks. Failures block execution. */
const _beforeHooks = {};

/** Mandatory post-tool hooks. Failures block result delivery. */
const _postHooks = {};

/** Observational after-tool hooks. Failures never alter tool results. */
const _afterHooks = {};

/** Register mandatory preprocessing hook. */
export function addBeforeToolHook(toolName, function_) {
  if (!_beforeHooks[toolName]) {
    _beforeHooks[toolName] = [];
  }
  _beforeHooks[toolName].push(function_);
}

/** Register mandatory postprocessing hook. */
export function addPostToolHook(toolName, function_) {
  if (!_postHooks[toolName]) {
    _postHooks[toolName] = [];
  }
  _postHooks[toolName].push(function_);
}

/**
 * Register a hook that fires after a tool completes successfully.
 * Wildcard "*" hooks fire for every tool.
 *
 * @param {string} toolName - Tool name or "*" for all tools
 * @param {(toolName: string, args: object, result: object) => Promise<void>} fn
 */
export function addAfterToolHook(toolName, fn) {
  if (!_afterHooks[toolName]) {
    _afterHooks[toolName] = [];
  }
  _afterHooks[toolName].push(fn);
}

/**
 * Clear all registered tools. Used during force-reload to
 * allow re-registration without duplicate entries.
 */
export function clearTools() {
  _tools.length = 0;
}

/**
 * Retain only tools whose name is in `allowed`; drop the rest. Used by the
 * minimal tool-surface mode to guarantee a small, fixed registry regardless of
 * how many tools were registered upstream.
 *
 * @param {Set<string>|Iterable<string>} allowed
 */
export function retainTools(allowed) {
  const keep = allowed instanceof Set ? allowed : new Set(allowed);
  for (let index = _tools.length - 1; index >= 0; index--) {
    if (!keep.has(_tools[index].name)) {
      _tools.splice(index, 1);
    }
  }
}

/**
 * Register a tool definition.
 *
 * @param {{
 *   name: string,
 *   description: string,
 *   inputSchema?: object,
 *   zodSchema?: import("zod/v4").ZodObject<any>,
 *   handler: (args: object) => Promise<{ isError?: boolean, content: Array<{ type: string, text: string }> }>
 * }} tool
 */
export function registerTool(tool) {
  _tools.push(tool);
}

/**
 * The raw registered tool definitions (including zodSchema and annotations),
 * for audits that need more than the advertised surface.
 *
 * @returns {Array<object>}
 */
export function declaredTools() {
  return _tools;
}

/**
 * List all registered tools with their names, descriptions, and input schemas.
 * Converts Zod schemas to JSON Schema via the built-in toJSONSchema() method.
 *
 * @returns {Array<{ name: string, description: string, inputSchema: object }>}
 */
export function listTools() {
  return _tools.map((t) => {
    let inputSchema = t.inputSchema ?? { type: "object", properties: {} };

    // If a Zod schema is provided, convert it to JSON Schema
    if (t.zodSchema) {
      try {
        const jsonSchema = t.zodSchema.toJSONSchema();
        // Properties with .default() should not be in required
        // because the server fills them in automatically
        const hasDefault = new Set(
          Object.entries(jsonSchema.properties ?? {})
            .filter(([, v]) => v && typeof v === "object" && "default" in v)
            .map(([k]) => k),
        );
        const required = (jsonSchema.required ?? []).filter((k) => !hasDefault.has(k));
        inputSchema = {
          type: jsonSchema.type ?? "object",
          properties: jsonSchema.properties ?? {},
          required,
        };
      } catch {
        // Fall back to plain inputSchema if conversion fails
      }
    }

    return { name: t.name, description: t.description, inputSchema };
  });
}

/**
 * Execute a tool by name with the given arguments.
 * Validates args against the tool's Zod schema (if provided) before calling the handler.
 *
 * @param {string} name - Tool name (e.g. "pix_tool", "rule_tool_frontend_react")
 * @param {object} args - Tool-specific arguments
 * @returns {Promise<{ isError?: boolean, content: Array<{ type: string, text: string }> }>}
 */
export async function callTool(name, args) {
  // A call is the only evidence that anyone still wants this process's heap.
  // Recorded before anything else, so even a call that fails validation counts
  // as use and postpones the idle reclaim.
  try {
    touchActivity();
  } catch {
    /* fail-open */
  }

  // ── Self-update: throttled fire-and-forget check on every invocation, kicked
  // BEFORE the cache lookup (so a cache hit can't skip it) and BEFORE tool
  // lookup (a skills reload re-registers _tools). NOT awaited: the tool
  // responds immediately; the banner of a completed background check is
  // consumed below and prepended to this result. pix_update runs its own
  // update. ──
  if (name !== "rule_tool_update") {
    try {
      maybeSelfUpdate();
    } catch {
      /* fail-open */
    }
  }
  // A harness that spells resume as the user's first message fires no hook, so
  // the prompt is the signal (core/resume). Applied here, beside the banner, and
  // deliberately not inside the cached core: a stored result must never carry a
  // snapshot of a repository that has since moved.
  let notice = "";
  try {
    notice = resumeAnnouncement({ prompt: args?.prompt, cwd: process.cwd() });
  } catch {
    /* fail-open */
  }

  const banner = [consumeUpdateBanner(), notice].filter(Boolean).join("\n\n");

  const tool = _tools.find((t) => t.name === name);
  if (!tool) {
    return withBanner(banner, { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] });
  }

  let stage = "validation";
  const startedAt = Date.now();
  try {
    const validated = tool.zodSchema ? tool.zodSchema.parse(args) : args;

    // ── Deterministic recycle: replay a cached result for read-only tools ──
    // The server never calls a model, so an identical (tool, args) call always
    // produces the same output. Serve it from cache instead of recomputing.
    stage = "cache";
    const cached = cacheLookup(name, validated);

    if (cached) {
      // Which tier answered is reported to the caller, not only to telemetry: a
      // cache that cannot say where an answer came from is one nobody can debug.
      const replay = { ...cached.result, _meta: { ...cached.result._meta, pixCache: { tier: cached.tier } } };
      // A hit goes through the same decoration as a miss, so it reports both.
      // Recording only the cache saving made every token figure a lower bound
      // on a cache-warm session (ADR 074).
      const { final, cavemanSaved, reminderTokens } = finalize(name, replay);

      recordToolCall({
        tool: name,
        args: validated,
        durationMs: Date.now() - startedAt,
        ok: true,
        cacheHit: true,
        cacheTier: cached.tier,
        entry: entryPathOf(name),
        mode: validated?.mode,
        argsBytes: argsBytes(validated),
        resultBytes: textBytes(final),
        coreTokens: estimateTokens(cached.result),
        finalTokens: estimateTokens(final),
        reminderTokens,
        replayedTokens: estimateTokens(cached.result),
        saved: { caveman: cavemanSaved },
      });

      return withBanner(banner, final);
    }

    stage = "preprocessing";
    const computed = await computeCore(name, tool, validated);
    const { arguments: processedArguments, core } = computed;

    stage = "finalize";

    if (!core?.isError) {
      // Cache the deterministic core (reminder + caveman + fingerprint are
      // re-applied per call).
      cacheStore(name, processedArguments, core, dependenciesOf(name, processedArguments, core));
      const { final, cavemanSaved, reminderTokens } = finalize(name, core);
      recordToolCall({
        tool: name,
        args: processedArguments,
        durationMs: Date.now() - startedAt,
        ok: true,
        cacheHit: false,
        cacheTier: "miss",
        entry: entryPathOf(name),
        routedSkill: routedSkillOf(name, core),
        mode: processedArguments?.mode,
        argsBytes: argsBytes(processedArguments),
        resultBytes: textBytes(final),
        coreTokens: estimateTokens(core),
        finalTokens: estimateTokens(final),
        guardrailFailures: core?._meta?.pixGuardrails?.failCount,
        guardrailRules: guardrailRulesOf(core),
        saved: { caveman: cavemanSaved },
        reminderTokens,
        estimatedRouting: estimateRoutingSaving(name, core, final),
      });
      const hooks = [...(_afterHooks["*"] || []), ...(_afterHooks[name] || [])];

      for (const function_ of hooks) {
        function_(name, processedArguments, final).catch(() => {});
      }

      return withBanner(banner, final);
    }

    // A failing guardrail check IS an error result, so the count has to be read
    // here too - otherwise the number is only ever recorded when it is zero.
    recordToolCall({
      tool: name,
      args: processedArguments,
      durationMs: Date.now() - startedAt,
      ok: false,
      cacheHit: false,
      cacheTier: "miss",
      entry: entryPathOf(name),
      mode: processedArguments?.mode,
      argsBytes: argsBytes(processedArguments),
      resultBytes: textBytes(core),
      guardrailFailures: core?._meta?.pixGuardrails?.failCount,
      guardrailRules: guardrailRulesOf(core),
    });

    return withBanner(banner, finalize(name, core).final);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((index) => `- ${index.path.join(".")}: ${index.message}`).join("\n");

      return withBanner(banner, { isError: true, content: [{ type: "text", text: `Invalid arguments:\n${issues}` }] });
    }

    recordToolCall({
      tool: name,
      args,
      durationMs: Date.now() - startedAt,
      ok: false,
      cacheHit: false,
      cacheTier: "miss",
      entry: entryPathOf(name),
      argsBytes: argsBytes(args),
    });

    return withBanner(banner, enforcementError(name, stage, error));
  }
}

/**
 * Read the SKILL.md file for a given skill name.
 *
 * The bundled `skills/` directory is the ONLY source. `~/.agents/skills` used to
 * take precedence, which let a directory in the user's home silently replace the
 * content this server ships under the same tool name.
 *
 * @param {string} skillName - e.g. "rule-frontend-react", "rule-styleguide"
 * @returns {string|null} - The full SKILL.md content, or null if not found
 */
export function readSkill(skillName) {
  const { embeddedSkills } = getSkillsDirectories();
  try {
    return readFileSync(join(embeddedSkills, skillName, "SKILL.md"), "utf8");
  } catch {
    return null;
  }
}

/**
 * Get a sorted list of all available skill names.
 *
 * The tool surface of this server is defined by the bundled `skills/` directory
 * and by nothing else. Two rules, both deliberate:
 *
 *   - only `skills/` is scanned. Merging `~/.agents/skills` meant any directory
 *     there became a callable tool under the pix_ prefix: 79 stale `rule-*`
 *     directories from the previous brand resurfaced as `pix_pix_*`, and
 *     generic skills like `test-driven-development` were renamed into the
 *     namespace. It also made plugin.js in the user's home an in-process import.
 *   - only `rule-*` names are accepted, so a foreign directory dropped into
 *     `skills/` cannot mint a tool that claims to be ours either.
 *
 * The bare `rule` directory is excluded: it backs the dispatcher tool, which
 * is registered by code, not as a per-skill tool.
 *
 * @returns {string[]}
 */

const skillCache = new Map();

export function getSkillMetadata(skillName) {
  const cacheKey = `meta:${skillName}`;
  const cached = skillCache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  const content = readSkill(skillName);
  if (!content) {
    return {};
  }
  const meta = parseSkillFrontmatter(content);
  skillCache.set(cacheKey, JSON.stringify(meta));
  return meta;
}

export function getSkillNames() {
  const names = new Set();
  const { embeddedSkills } = getSkillsDirectories();
  try {
    for (const entry of readdirSync(embeddedSkills, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("rule-")) {
        continue;
      }
      if (!existsSync(join(embeddedSkills, entry.name, "SKILL.md"))) {
        continue;
      }
      names.add(entry.name);
    }
  } catch {
    /* no dir */
  }
  return [...names].sort();
}

/**
 * Check if a skill name is foreign to this server.
 *
 * getSkillNames() only ever yields `rule-*` names, so this is false for every
 * registered skill. It is kept as an explicit guard: resources and skill tools
 * consult it before treating a name as ours.
 *
 * @param {string} skillName
 * @returns {boolean}
 */
export function isPluginSkill(skillName) {
  // rule is the router skill, not a plugin
  if (skillName === "rule") {
    return false;
  }
  return !skillName.startsWith("rule-");
}

/**
 * Whether a skill ships a plugin.js.
 *
 * Always false: plugin.js was only ever imported from `~/.agents/skills`, which
 * this server no longer reads. Importing it meant executing code from the user's
 * home directory in-process at startup, with no isolation and failures swallowed
 * (2026-08-04 audit, finding 15). Bundled skills carry no plugin.js.
 *
 * @param {string} _pluginName - The plugin directory name
 * @returns {boolean}
 */
export function hasPluginJs(_pluginName) {
  return false;
}
