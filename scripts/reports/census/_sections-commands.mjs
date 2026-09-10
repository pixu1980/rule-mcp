

/**
 * @module scripts/reports/census/_sections-commands
 *
 * The slash commands, split into the kinds a reader picks between.
 *
 * The kinds are derived rather than listed: a persona command is one whose
 * name parses as a persona, an area command is one that names an area, and
 * whatever is left is a workflow. A new command therefore lands in a kind
 * without anyone editing this file. Only the session set is written, because
 * "crosses a context boundary" is a judgment no registry records.
 */

import { table } from "./_format.mjs";
import { ROUTER_COMMAND, parsePersonaName } from "./_registries.mjs";

/** The commands that carry a session across a context boundary. */
const SESSION = new Set(["rule-handoff", "rule-handon", "rule-init", "rule-process-check", "rule-update"]);

/**
 * Every command, in its kind.
 *
 * @param {object} data - the gathered surface
 * @returns {Array<{kind: string, what: string, commands: string[]}>}
 */
export function commandKinds(data) {
  const kinds = { router: [], area: [], workflow: [], session: [], persona: [] };

  for (const name of data.commands) {
    if (name === ROUTER_COMMAND) {
      kinds.router.push(name);
    } else if (parsePersonaName(name)) {
      kinds.persona.push(name);
    } else if (SESSION.has(name)) {
      kinds.session.push(name);
    } else if (name.startsWith("rule-area-")) {
      kinds.area.push(name);
    } else {
      kinds.workflow.push(name);
    }
  }

  return [
    { kind: "router", what: "Routes a free-text request to the skill that answers it", commands: kinds.router },
    { kind: "area", what: "Routes within one area, when the area is known and the skill is not", commands: kinds.area },
    { kind: "workflow", what: "Runs a named workflow: a decision record, a pre-flight check", commands: kinds.workflow },
    { kind: "session", what: "Carries a session across a context boundary", commands: kinds.session },
    { kind: "persona", what: "Runs one review role at one operation, and writes its documents", commands: kinds.persona },
  ];
}

/** The counted breakdown, for the generated instructions document. */
export function commandKindsSection(data) {
  const kinds = commandKinds(data);
  const named = (kind) => kinds.find((entry) => entry.kind === kind);

  return [
    `### The kinds (${data.commands.length} commands)`,
    "",
    ...table(
      ["Kind", "Count", "What it is for"],
      kinds.map((entry) => [`\`${entry.kind}\``, entry.commands.length, entry.what]),
    ),
    "",
    ...kinds.flatMap((entry) => (entry.kind === "persona" ? [] : [`**${entry.kind}**: ${entry.commands.map((name) => `\`/${name}\``).join(", ")}`, ""])),
    `The ${named("persona").commands.length} persona commands are one per role and operation`,
    "([`13-personas.md`](13-personas.md)).",
    "",
  ];
}

/**
 * The block the workflow chapter carries: what a developer types, and the
 * counts behind each kind. Written into `docs/07-engineering-guides.md`.
 */
export function commandSurfaceBlock(data) {
  const kinds = commandKinds(data);
  const named = (kind) => kinds.find((entry) => entry.kind === kind);

  return [
    "",
    `### The command surface today (${data.commands.length})`,
    "",
    ...table(
      ["Kind", "Count", "Example", "Reach for it when"],
      kinds.map((entry) => [`\`${entry.kind}\``, entry.commands.length, `\`/${entry.commands[0] ?? "-"}\``, entry.what]),
    ),
    "",
    `**Areas**: ${named("area")
      .commands.map((name) => `\`/${name}\``)
      .join(", ")}`,
    "",
    `**Workflows**: ${named("workflow")
      .commands.map((name) => `\`/${name}\``)
      .join(", ")}`,
    "",
    `**Sessions**: ${named("session")
      .commands.map((name) => `\`/${name}\``)
      .join(", ")}`,
    "",
    "Every command, with its description and its install target, is in",
    "[`11-instructions.md`](11-instructions.md). Regenerate this block with `pnpm census`.",
    "",
  ];
}
