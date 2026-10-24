/**
 * @module core/layers/guardrails
 *
 * The rules each skill owns, loaded from the layer that won (ADR 089).
 *
 * A skill declares its rules in the SKILL.md frontmatter and defines them in
 * `guardrails/index.js` beside it. Both halves are checked against each other:
 * a rule the frontmatter declares and the folder does not export, or the other
 * way round, is drift and is reported by name.
 *
 * Importing that folder runs code from wherever the skill came from, which for
 * the project and user layers means code this server did not ship. ADR 089
 * records that decision and its cost. What this module owes in return is that
 * a folder which throws, or exports something that is not a rule, is reported
 * and stepped over: one bad skill must not stop the server answering about the
 * other 88.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { resolveSkillDirs } from "./_resolve.js";

/** Whether an export is usable as a guardrail. */
function ruleProblem(rule) {
  if (!rule || typeof rule !== "object") {
    return "is not an object";
  }

  if (typeof rule.id !== "string" || rule.id.trim() === "") {
    return "has no id";
  }

  if (typeof rule.check !== "function") {
    return `"${rule.id}" has no check function`;
  }

  return null;
}

/** Every rule a guardrails module exports, from arrays or single objects. */
function rulesIn(module_) {
  const found = [];

  for (const value of Object.values(module_)) {
    if (Array.isArray(value)) {
      found.push(...value);
      continue;
    }

    if (value && typeof value === "object" && "check" in value) {
      found.push(value);
    }
  }

  return found;
}

/** Import one skill's guardrails folder, reporting what it could not use. */
async function loadFolder(entry, problems) {
  const index = join(entry.dir, "guardrails", "index.js");

  if (!existsSync(index)) {
    return [];
  }

  let module_;

  try {
    module_ = await import(pathToFileURL(index).href);
  } catch (error) {
    problems.push({ skill: entry.name, layer: entry.layer, reason: `guardrails did not load: ${error.message}` });

    return [];
  }

  const usable = [];

  for (const rule of rulesIn(module_)) {
    const problem = ruleProblem(rule);

    if (problem) {
      problems.push({ skill: entry.name, layer: entry.layer, reason: `exported guardrail ${problem}` });
      continue;
    }

    usable.push(rule);
  }

  return usable;
}

/** Report a frontmatter that no longer matches the folder beside it. */
function reportDrift(entry, loaded, problems) {
  const declaredIds = entry.meta.guardrails;

  if (!declaredIds?.length && loaded.length === 0) {
    return;
  }

  const declared = new Set(declaredIds);
  const exported = new Set(loaded.map((rule) => rule.id));

  for (const id of declared) {
    if (!exported.has(id)) {
      problems.push({ skill: entry.name, layer: entry.layer, reason: `declares guardrail "${id}", which its guardrails folder does not export` });
    }
  }

  for (const id of exported) {
    if (!declared.has(id)) {
      problems.push({ skill: entry.name, layer: entry.layer, reason: `exports guardrail "${id}", which its SKILL.md does not declare` });
    }
  }
}

/**
 * Every skill that resolves, with the rules it owns and the skills it inherits.
 *
 * @param {{ cwd?: string }} [options]
 * @returns {Promise<Map<string, { name: string, layer: string, dir: string, inherits: string[], guardrails: object[] }>>}
 */
export async function loadLayerGuardrails(options = {}) {
  const resolved = resolveSkillDirs(options);
  const loaded = new Map();
  const problems = [...resolved.problems];

  loaded.problems = problems;

  for (const entry of resolved.values()) {
    const guardrails = await loadFolder(entry, problems);

    reportDrift(entry, guardrails, problems);
    loaded.set(entry.name, { name: entry.name, layer: entry.layer, dir: entry.dir, inherits: entry.meta.inherits ?? [], guardrails });
  }

  return loaded;
}
