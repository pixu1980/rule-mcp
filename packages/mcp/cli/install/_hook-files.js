/** @module cli/install/hook-files - where a host's hook document is merged */

import { join } from "node:path";

import { HOME, atomicWrite, readText, removeFile } from "../installers/_paths.js";
import { parseJson, toJson } from "../installers/_writers-json.js";
import { hookLauncher } from "../installers/_env-command.js";
import { HOOK_MARKER } from "../../core/agents/_hook-commands.js";
import { withHooks, withoutHooks } from "../../core/agents/_hooks.js";
import { codexHooks, cursorHooks, geminiHooks, kiroHooks } from "./_hook-writers.js";

export { hookLauncher } from "../installers/_env-command.js";

/** The file a native host reads its hooks from, or null when it loads code. */
export function hookFile(agent) {
  const files = {
    claude: join(HOME, ".claude", "settings.json"),
    codex: join(HOME, ".codex", "hooks.json"),
    cursor: join(HOME, ".cursor", "hooks.json"),
    gemini: join(HOME, ".gemini", "settings.json"),
    kiro: join(HOME, ".kiro", "hooks", "rule-mcp.json"),
  };

  return files[agent] ?? null;
}

const isNested = (entry) => (entry?.hooks ?? []).some((hook) => typeof hook?.command === "string" && hook.command.includes(HOOK_MARKER));

const isFlat = (entry) => typeof entry?.command === "string" && entry.command.includes(HOOK_MARKER);

const isNamed = (entry) => typeof entry?.name === "string" && entry.name.startsWith("rule-mcp-");

/**
 * Merge one event map, replacing only our entries and leaving every other hook
 * untouched. Events left without entries disappear.
 *
 * @param {Record<string, Array<object>>} current
 * @param {Record<string, Array<object>>} incoming
 * @param {(entry: object) => boolean} ours
 * @returns {Record<string, Array<object>>}
 */
function mergeEvents(current = {}, incoming = {}, ours = isNested) {
  const next = { ...current };

  for (const [event, entries] of Object.entries(incoming)) {
    next[event] = [...(next[event] ?? []).filter((entry) => !ours(entry)), ...entries];
  }

  return next;
}

/**
 * Remove our entries from every event, dropping an event left empty.
 *
 * @param {Record<string, Array<object>>} current
 * @param {(entry: object) => boolean} ours
 * @returns {Record<string, Array<object>>}
 */
function stripEvents(current = {}, ours = isNested) {
  const next = {};

  for (const [event, entries] of Object.entries(current)) {
    const others = (entries ?? []).filter((entry) => !ours(entry));

    if (others.length > 0) {
      next[event] = others;
    }
  }

  return next;
}

/**
 * The document to write for one host, starting from what is already on disk.
 * Returns null when there is nothing to write, or when the existing file is not
 * valid JSON and must not be clobbered.
 *
 * @param {string} agent
 * @param {object} current
 * @param {{ command: string, args?: string[] }} launcher
 * @returns {object|null}
 */
export function mergeHookDocument(agent, current, launcher) {
  const merge = {
    claude: () => withHooks(current, launcher),
    codex: () => ({ ...current, hooks: mergeEvents(current?.hooks, codexHooks(launcher).hooks) }),
    gemini: () => ({ ...current, hooks: mergeEvents(current?.hooks, geminiHooks(launcher)) }),
    cursor: () => ({ ...current, version: 1, hooks: mergeEvents(current?.hooks, cursorHooks(launcher).hooks, isFlat) }),
    kiro: () => {
      const others = (current?.hooks ?? []).filter((entry) => !isNamed(entry));

      return { ...current, version: "v1", hooks: [...others, ...kiroHooks(launcher).hooks] };
    },
  };

  return merge[agent]?.() ?? null;
}

/**
 * Strip our hooks, and any container left empty by their removal. `null` means
 * the file itself belonged to us and should be deleted.
 *
 * @param {string} agent
 * @param {object} current
 * @returns {object|null}
 */
export function stripHookDocument(agent, current) {
  if (agent === "kiro") {
    const hooks = (current?.hooks ?? []).filter((entry) => !isNamed(entry));

    return hooks.length === 0 ? null : { ...current, hooks };
  }

  if (agent === "claude") {
    return withoutHooks(current);
  }

  const ours = agent === "cursor" ? isFlat : isNested;
  const hooks = stripEvents(current?.hooks, ours);
  const next = { ...current, hooks };

  if (Object.keys(hooks).length === 0) {
    delete next.hooks;
  }

  return next;
}

/**
 * Read a JSON document, tolerating a missing or empty file but never an
 * unparseable one.
 *
 * @param {string} file
 * @returns {object|null}
 */
function readDocument(file) {
  const text = readText(file);

  if (!text.trim()) {
    return {};
  }

  const parsed = parseJson(text);

  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
}

/**
 * Write this host's hooks, if it reads them from a file.
 *
 * @param {{ agent: string, entrypoint: string, dryRun?: boolean }} options
 * @returns {string|null} the file written, or null when the host has none
 */
export function installHookFile({ agent, entrypoint, dryRun = false }) {
  const file = hookFile(agent);

  if (!file) {
    return null;
  }

  const current = readDocument(file);

  if (current === null) {
    return null;
  }

  const document = mergeHookDocument(agent, current, hookLauncher(entrypoint));

  return document === null ? null : atomicWrite({ file, content: toJson(document), dryRun });
}

/**
 * Remove this host's hooks, deleting the file only when the whole file was
 * ours (Kiro's per-install document).
 *
 * @param {{ agent: string, dryRun?: boolean }} options
 * @returns {string|null}
 */
export function removeHookFile({ agent, dryRun = false }) {
  const file = hookFile(agent);

  if (!file) {
    return null;
  }

  const current = readDocument(file);

  if (current === null) {
    return null;
  }

  const document = stripHookDocument(agent, current);

  if (document === null) {
    if (!dryRun) {
      removeFile(file);
    }

    return file;
  }

  return atomicWrite({ file, content: toJson(document), dryRun });
}
