

/** Deterministic decision-cache protocol: redact, state, question, parse and decide. */
import { createHash } from "node:crypto";

import { buildChoiceQuestion, probabilityOf } from "../../decision/_rerank.js";
import { guardAmbiguity, guardCandidate } from "./_decision-guards.js";
import { NORMALIZABLE } from "./_state.js";

export { guardAmbiguity, guardCandidate } from "./_decision-guards.js";

/** The measured floor: the corpus report recommends it with ten predictions and zero false replays. */
export const SHADOW_THRESHOLD = 0.7;
/** The label that means "none of these is the same request". */
export const NONE_LABEL = "none";
/** What the model reads for the none label. */
export const NONE_DESCRIPTION = "none of these is the same request";
/** The cache gate's question, distinct from the routing question. */
export const GATE_INSTRUCTIONS =
  "Pick the candidate only when it would answer the same request as the query, even when the wording differs. The same skill is not enough: the intent must match. Pick none when no candidate shares the intent.";

const HOME = /\/(?:Users|home)\/[^/\s]+/gu;
const WINDOWS_HOME = /[A-Za-z]:\\Users\\[^\\\s]+/gu;
const SECRETS = /\b(?:sk-[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9]{10,}|github_pat_[A-Za-z0-9_]{10,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16})\b/gu;
const ASSIGNMENTS = /\b(password|passwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*\S+/giu;
const PROMPT_CHAR_CAP = 300;
const CONTEXT_CHAR_CAP = 120;
const STATE_CHAR_CAP = 600;

/** Remove home paths and obvious credentials before a prompt leaves the process. */
export function redact(text) {
  return String(text ?? "")
    .replaceAll(HOME, "~")
    .replaceAll(WINDOWS_HOME, "~")
    .replaceAll(SECRETS, "[redacted]")
    .replaceAll(ASSIGNMENTS, "$1=[redacted]");
}

/** Collapse whitespace and cap a single-line value. */
export function truncate(text, max = 160) {
  const value = String(text ?? "")
    .replaceAll(/\s+/gu, " ")
    .trim();

  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 3))}...`;
}

/** A stable, non-reversible prompt identifier for the shadow report. */
export function promptHash(text) {
  return createHash("sha256")
    .update(String(text ?? ""))
    .digest("hex")
    .slice(0, 12);
}

/** The compact state the model reads: tool, query, context and candidate count. */
export function buildGateState({ toolName, args, livePrompt, candidates }) {
  const fields = NORMALIZABLE.get(toolName) ?? new Set();
  const context = Object.keys(args ?? {})
    .filter((key) => !fields.has(key) && args[key] !== undefined)
    .sort()
    .map((key) => `${key}: ${truncate(redact(String(args[key])), CONTEXT_CHAR_CAP)}`);
  const lines = [
    `tool: ${toolName}`,
    `query: ${truncate(redact(livePrompt), PROMPT_CHAR_CAP)}`,
    ...context,
    `candidates: ${candidates.length}`,
  ];
  const state = lines.join("\n");

  return state.length <= STATE_CHAR_CAP ? state : `${state.slice(0, STATE_CHAR_CAP - 3)}...`;
}

/** The one choice question the gate asks, with the candidates plus none. */
export function buildGateQuestion(candidates) {
  const shortlist = candidates.map(({ label, description }) => ({ skill: label, description }));

  shortlist.push({ skill: NONE_LABEL, description: NONE_DESCRIPTION });

  return buildChoiceQuestion(shortlist, GATE_INSTRUCTIONS);
}

/** Read a choice and its probability from either the API answer or a rerank result. */
export function parseGateAnswer(answer, candidates, threshold = SHADOW_THRESHOLD) {
  const value = answer?.answers?.pick ?? answer?.pick;
  const choice = typeof value === "string" ? value : value?.choice;

  if (typeof choice !== "string" || choice.length === 0) {
    return { choice: null, probability: 0, candidate: null, wouldReplay: false, reason: "no-choice" };
  }

  const probability = typeof answer?.probability === "number" ? answer.probability : probabilityOf(answer, choice);

  if (choice === NONE_LABEL) {
    return { choice, probability, candidate: null, wouldReplay: false, reason: "none" };
  }

  const candidate = candidates.find((item) => item.label === choice) ?? null;

  if (!candidate) {
    return { choice, probability, candidate: null, wouldReplay: false, reason: "unknown-label" };
  }

  if (!(probability >= threshold)) {
    return { choice, probability, candidate, wouldReplay: false, reason: "below-threshold" };
  }

  return { choice, probability, candidate, wouldReplay: true, reason: "candidate" };
}

/** Parse, threshold and guard in one place; the default is a miss. */
export function decideShadow({ answer, candidates, live, threshold = SHADOW_THRESHOLD }) {
  const parsed = parseGateAnswer(answer, candidates, threshold);
  const reason = parsed.candidate
    ? (guardCandidate(parsed.candidate, live) ?? guardAmbiguity(parsed.candidate, candidates))
    : null;

  return reason ? { ...parsed, wouldReplay: false, reason, guard: reason } : { ...parsed, guard: null };
}
