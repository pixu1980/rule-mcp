/**
 * @module core/tokensave/memory
 *
 * The optional session memory: mirror a decision into TokenSave and recall it.
 *
 * `docs/adr/` stays the source of truth. These calls are a convenience index
 * beside it, so an unavailable graph is a no-op, never an error.
 *
 * @see module:core/tokensave/probe - the availability check
 */

import { callToolSync } from "./_client-sync.js";
import { probeFilesystem } from "./_probe.js";

/**
 * Persist a decision so a later session can recall it.
 *
 * @param {string} [projectDir]
 * @param {{ text: string, reason?: string, files?: string[], tags?: string[] }} decision
 * @param {{ probe?: Function, client?: Function }} [options]
 * @returns {{ ok: boolean, unavailable?: boolean, error?: string }}
 */
export function recordDecision(projectDir = process.cwd(), { text, reason, files = [], tags = [] } = {}, { probe = probeFilesystem, client = callToolSync } = {}) {
  if (!text || !probe(projectDir).available) {
    return { ok: false, unavailable: true };
  }

  const result = client("record_decision", { text, reason, files, tags }, { projectDir });

  return result.ok ? { ok: true } : { ok: false, unavailable: true, error: result.error };
}

/**
 * Recall persisted decisions, or null when the graph cannot answer.
 *
 * @param {string} [projectDir]
 * @param {{ query?: string, limit?: number, include_code_areas?: boolean }} [options]
 * @param {{ probe?: Function, client?: Function }} [inject]
 * @returns {object|null}
 */
export function sessionRecall(projectDir = process.cwd(), { query, limit = 10, include_code_areas } = {}, { probe = probeFilesystem, client = callToolSync } = {}) {
  if (!probe(projectDir).available) {
    return null;
  }

  const result = client("session_recall", { query, limit, include_code_areas }, { projectDir });

  return result.ok ? result.value : null;
}
