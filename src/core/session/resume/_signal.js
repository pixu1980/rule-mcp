/** @module core/session/resume/signal - is this prompt a resume request? */


/**
 * Prompts that mean "carry on from where we stopped" and nothing else.
 *
 * `pi resume`, and every harness that spells it that way, does not fire a hook:
 * it turns the word into the user's first message. So the only place it can be
 * caught is the prompt, and the prompt is read strictly: the whole prompt, once
 * punctuation and case are gone, has to be one of these. A rule that fired on any
 * sentence containing "continue" would answer "continue implementing the parser"
 * with a handoff.
 */
const RESUME_PHRASES = new Set([
  "resume",
  "resume work",
  "resume the work",
  "resume session",
  "resume the session",
  "resume where we left off",
  "continue",
  "continue work",
  "continue the work",
  "continue where we left off",
  "continue from where we left off",
  "pick up where we left off",
  "where were we",
  "where did we leave off",
  "handon",
  "handoff",
  "riprendi",
  "riprendi il lavoro",
  "riprendi da dove eravamo",
  "continua",
  "continua il lavoro",
  "dove eravamo",
]);

/**
 * Whether a prompt asks to resume and asks nothing else.
 *
 * @param {string} [prompt]
 * @returns {boolean}
 */
export function isResumeSignal(prompt) {
  if (typeof prompt !== "string") {
    return false;
  }

  const normalized = prompt
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s]+/gu, " ")
    .replaceAll(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return false;
  }

  return RESUME_PHRASES.has(normalized);
}

