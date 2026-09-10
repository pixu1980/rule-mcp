

/**
 * @module core/agents/hooks
 *
 * Harness hooks for the two steps a prompt cannot enforce.
 *
 * A workflow rule the model has to remember is not a gate. Session analysis of a
 * real feature put a number on it: a migration applied at 19:38 was reviewed at
 * 05:23 the next morning, and by then four columns, a table and five indexes had
 * ten hours of code built on top of them. The correction cost more than the ten
 * turns that produced the schema. The migration command is the point of no
 * return, so that is where the confirmation belongs - in the harness, before the
 * command runs, not in a paragraph the model reads.
 *
 * Two PreToolUse checks, both answering with `permissionDecision: "ask"`:
 *
 * - migration: any migrate/push/upgrade command from the common ORMs
 * - commit: `git commit`, with the guardrail failures on the staged files
 *
 * "ask" and not "deny" on purpose. These are judgment calls with a human in the
 * room; a hard block on a false positive costs more than the prompt it saves.
 *
 * Two more hooks carry the session rules a prompt cannot enforce either, this
 * time by injecting context rather than by deciding: SessionStart states the
 * full directive once, UserPromptSubmit re-anchors it in one line per prompt.
 *
 * SessionStart carries one more thing no prompt can know - whether the session
 * was resumed. When it was, and only then, the verified handoff goes in behind
 * the directive, so a user who typed `resume` and nothing else starts where they
 * stopped instead of being asked what they were doing.
 *
 * @see module:cli/guard - the command the hooks invoke
 * @see module:core/directive - the text those two inject
 */

import { HOOK_MARKER } from "./_hook-commands.js";

export { HOOK_MARKER, isCommitCommand, isMigrationCommand, MIGRATION_PATTERNS } from "./_hook-commands.js";

/** The hook events we install into, in the order they fire. */
export const HOOK_EVENTS = ["PreToolUse", "SessionStart", "UserPromptSubmit"];

/**
 * Our hook entries, keyed by event, ready to merge into a settings file.
 *
 * @param {{ command: string, args?: string[] }} launcher - How to invoke this CLI
 * @returns {Record<string, Array<object>>} entries per hook event
 */
export function hookEntries(launcher) {
  const invoke = (subcommand) => [launcher.command, ...(launcher.args ?? []), "guard", subcommand].map((part) => (/\s/.test(part) ? JSON.stringify(part) : part)).join(" ");
  const entry = (subcommand, statusMessage, extra = {}) => ({
    ...extra,
    hooks: [
      {
        type: "command",
        command: `${invoke(subcommand)}  # ${HOOK_MARKER}`,
        timeout: 60,
        statusMessage,
      },
    ],
  });

  return {
    // One entry, not two: both checks fit in a single decision, so a Bash call
    // pays one process spawn instead of two. No `if` filter either - it would be
    // a glob per ORM for migrations, and `Bash(git commit*)` misses
    // `git -C path commit`.
    PreToolUse: [entry("bash", "rule guard: migration and commit checks", { matcher: "Bash" })],
    // Full directive once per session, one line per prompt after that. Same
    // full-once-then-terse shape as the workflow reminder, for the same reason:
    // the rules have to survive turn 50 without being paid for 50 times.
    // SessionStart also injects the verified handoff when `source` is "resume".
    SessionStart: [entry("session-start", "rule: session directive, handoff on resume")],
    UserPromptSubmit: [entry("prompt-submit", "rule: prompt directive")],
  };
}

/** @param {object} entry @returns {boolean} */
function isOurs(entry) {
  return (entry?.hooks ?? []).some((hook) => typeof hook?.command === "string" && hook.command.includes(HOOK_MARKER));
}

/**
 * Merge our hooks into a settings object, replacing any previous version of
 * them and leaving every other hook untouched. Idempotent.
 *
 * @param {object} settings - Parsed settings.json (mutated copy is returned)
 * @param {{ command: string, args?: string[] }} launcher
 * @returns {object} the updated settings
 */
export function withHooks(settings, launcher) {
  const next = { ...settings, hooks: { ...settings?.hooks } };
  const ours = hookEntries(launcher);

  for (const event of HOOK_EVENTS) {
    const others = (next.hooks[event] ?? []).filter((entry) => !isOurs(entry));
    next.hooks[event] = [...others, ...ours[event]];
  }

  return next;
}

/**
 * Remove our hooks, and any container left empty by their removal.
 *
 * @param {object} settings
 * @returns {object}
 */
export function withoutHooks(settings) {
  const next = { ...settings, hooks: { ...settings?.hooks } };

  for (const event of HOOK_EVENTS) {
    const others = (next.hooks[event] ?? []).filter((entry) => !isOurs(entry));

    if (others.length > 0) {
      next.hooks[event] = others;
    } else {
      delete next.hooks[event];
    }
  }

  if (Object.keys(next.hooks).length === 0) {
    delete next.hooks;
  }

  return next;
}

/** @param {object} settings @returns {boolean} */
export function hasHooks(settings) {
  return HOOK_EVENTS.some((event) => (settings?.hooks?.[event] ?? []).some((entry) => isOurs(entry)));
}
