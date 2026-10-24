/**
 * @module core/commit/rule
 *
 * The one Conventional Commit rule.
 *
 * The subject every commit gate accepts is defined here and nowhere else: the
 * `commit-msg` hook, the `pre-push` hook, the CLI, `/rule-git`, the handoff
 * commits and CI all reach this module, so a rule change lands in one place and
 * cannot drift between them.
 *
 * Format: `type(scope): subject`, with an optional `!` before the colon for a
 * breaking change (`feat(api)!: replace the authentication API`), and the
 * `BREAKING CHANGE:` footer recognized as the long form.
 */

/** The one accepted type list for every commit gate (OSS-19). */
export const COMMIT_TYPES = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"];

/**
 * System-generated subjects, which cannot carry a scope: GitHub's merge ref
 * ("Merge <sha> into <sha>"), PR merges ("Merge pull request #N from ...") and
 * web reverts ('Revert "..."'). Every gate exempts exactly these prefixes.
 */
export const SYSTEM_MESSAGE_PREFIXES = ["Merge", "Revert"];

const SYSTEM_SUBJECT = new RegExp(`^(?:${SYSTEM_MESSAGE_PREFIXES.join("|")}) `, "u");

/** The `type(scope)!: subject` subject, with the scope and `!` as capture groups. */
export const SUBJECT_PATTERN = new RegExp(String.raw`^(${COMMIT_TYPES.join("|")})\(([a-z0-9._-]+)\)(!?): (.+)$`, "u");

/** The long-form breaking-change footer. */
export const BREAKING_FOOTER_PATTERN = /^BREAKING[ -]CHANGE:/mu;

/**
 * Is this a system-generated subject every gate must exempt?
 *
 * @param {string} subject
 * @returns {boolean}
 */
export function isSystemSubject(subject) {
  return SYSTEM_SUBJECT.test(subject ?? "");
}

/**
 * Is this a declared type?
 *
 * @param {string} type
 * @returns {boolean}
 */
export function isKnownType(type) {
  return COMMIT_TYPES.includes(type);
}

/**
 * @typedef {object} ParsedCommit
 * @property {string} subject first line, trimmed
 * @property {string} body the rest of the message
 * @property {string} type "" when the subject does not match
 * @property {string} scope
 * @property {string} description
 * @property {boolean} valid the subject matches `type(scope): subject`
 * @property {boolean} breaking a `!` before the colon, or a `BREAKING CHANGE:` footer
 */

/**
 * Parse a commit message.
 *
 * @param {string} [text] the full message (subject and body)
 * @returns {ParsedCommit}
 */
export function parseCommitMessage(text = "") {
  const [first = "", ...rest] = String(text).split("\n");
  const subject = first.trim();
  const body = rest.join("\n");
  const match = SUBJECT_PATTERN.exec(subject);

  return {
    subject,
    body,
    type: match?.[1] ?? "",
    scope: match?.[2] ?? "",
    description: match?.[4] ?? "",
    valid: Boolean(match),
    breaking: Boolean(match?.[3]) || BREAKING_FOOTER_PATTERN.test(body),
  };
}

/**
 * Why a subject was rejected, in one actionable sentence.
 *
 * The order is the order a person reads the string: the type, then the scope,
 * then the separator, then the description.
 *
 * @param {string} subject
 * @returns {string}
 */
export function explainViolation(subject) {
  const trimmed = (subject ?? "").trim();

  if (trimmed === "") {
    return "the subject is empty";
  }

  const type = /^([A-Za-z]+)/u.exec(trimmed)?.[1] ?? "";

  if (!type) {
    return `the subject does not start with a type; expected one of: ${COMMIT_TYPES.join(", ")}`;
  }

  if (!isKnownType(type)) {
    return `"${type}" is not an accepted type; expected one of: ${COMMIT_TYPES.join(", ")}`;
  }

  if (!/^[A-Za-z]+\(/u.test(trimmed)) {
    return `missing scope; "${type}(<scope>): <subject>" is required`;
  }

  if (!/^[A-Za-z]+\([a-z0-9._-]+\)/u.test(trimmed)) {
    return "the scope must be lower-case letters, digits, dot, underscore or hyphen";
  }

  if (!/\)!?:/u.test(trimmed)) {
    return "missing the ': ' separator after the scope";
  }

  if (!/\)!?:\s*\S/u.test(trimmed)) {
    return "the description after ': ' is empty";
  }

  return "the subject does not match type(scope): subject";
}

/**
 * The corrective block every gate prints when it rejects a subject.
 *
 * @param {string} [subject] the rejected subject, quoted when present
 * @returns {string}
 */
export function violationHelp(subject) {
  return [
    "Conventional Commit required: type(scope): subject",
    "  valid:   feat(skills): add rule-mcp naming",
    "  valid:   fix(api)!: replace the authentication API",
    "  invalid: docs: port documentation            (missing scope)",
    ...(subject ? [`  got:     ${subject}`] : []),
  ].join("\n");
}
