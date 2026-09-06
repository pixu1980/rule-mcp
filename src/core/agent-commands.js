/**
 * @module core/agent-commands
 *
 * Registry-driven generator for agent slash-command files.
 *
 * A single source of truth (the MCP prompt registry, {@link module:prompts/index})
 * drives the clean `/rule-*` commands installed into every coding agent
 * (Claude Code, Pi, Gemini CLI, Cursor, Windsurf, Cline). This replaces the
 * hand-maintained per-agent heredocs so the command set never drifts from the
 * prompts and stays consistently ordered.
 *
 * Ordering (see {@link commandNames}): the `rule` router is pinned
 * first; every remaining command follows in locale-alphabetical order.
 *
 * Why clean commands at all: Claude Code exposes MCP prompts as
 * `/<server>:<prompt> (MCP)` - the server prefix cannot be dropped client-side.
 * User-level command files (`~/.claude/commands/*.md`) are invoked bare
 * (`/rule-handoff`), so the installer ships these AND suppresses the server's
 * prompts for Claude (RULE_MCP_NO_PROMPTS=1) to avoid duplicate entries.
 *
 * @see module:prompts/index - listPrompts (the source registry)
 * @see module:cli/install - installClaude sets RULE_MCP_NO_PROMPTS
 */

import { listPrompts } from "../prompts/index.js";
import { activeRoles } from "./review-roles.js";
import { OPERATIONS } from "./review-roles-template.js";

/** The router command, pinned first in every agent's command list. */
export const ROUTER_COMMAND = "rule";

/**
 * Render formats, as data. Two independent axes:
 *   - `ext`         the filename suffix the host discovers
 *   - `frontmatter` "yaml" (Markdown hosts), "toml" (Gemini), or null (prose only)
 *   - `placeholder` the host's argument token, or null when the host does NOT
 *                   substitute one (then `$ARGUMENTS` is replaced by prose, so a
 *                   literal, meaningless token never reaches the model)
 */
const FORMATS = {
  // Claude Code, Pi, Cursor, opencode - substitute $ARGUMENTS
  args: { ext: ".md", frontmatter: "yaml", placeholder: "$ARGUMENTS" },
  // Roo Code / forks - frontmatter menu entry, arguments typed by hand
  plain: { ext: ".md", frontmatter: "yaml", placeholder: null },
  // VS Code Copilot Chat prompt files - `/name`, ${input:...} only, no $ARGUMENTS
  prompt: { ext: ".prompt.md", frontmatter: "yaml", placeholder: null },
  // Windsurf, Cline - workflow files, no argument substitution
  workflow: { ext: ".md", frontmatter: null, placeholder: null },
  // Gemini CLI (and forks) - TOML with {{args}}
  gemini: { ext: ".toml", frontmatter: "toml", placeholder: "{{args}}" },
  // Devin - one directory per command, each holding a SKILL.md
  devin: { ext: "/SKILL.md", frontmatter: "devin", placeholder: null },
};

/** Devin skills: one directory per command, each holding a SKILL.md. */
const DEVIN_SKILL = { ext: "/SKILL.md", frontmatter: "devin" };

/** Supported render formats → file extension. */
export const FORMAT_EXT = Object.fromEntries(Object.entries(FORMATS).map(([format, spec]) => [format, spec.ext]));

/**
 * Stand-in for `$ARGUMENTS` on hosts that do not substitute anything: the text
 * the user typed after the command is already appended to the prompt by the
 * host, so the body only has to name it.
 */
const ARGUMENTS_PROSE = "the request typed after this command in the chat input";

/**
 * Canonical command order: the router first, then all prompt names sorted
 * locale-alphabetically. This is the single ordering used everywhere commands
 * are enumerated (installers, docs, help output).
 *
 * @returns {string[]}
 */
export function commandNames() {
  const prompts = listPrompts()
    .map((p) => p.name)
    .filter((name) => name !== ROUTER_COMMAND)
    .sort((a, b) => a.localeCompare(b));

  return [ROUTER_COMMAND, ...prompts];
}

/** Collapse whitespace and wrap a string as a safe double-quoted YAML/TOML scalar. */
function quoted(text) {
  return `"${String(text)
    .replaceAll(/\s+/g, " ")
    .trim()
    .replaceAll('"', String.raw`\"`)}"`;
}

/**
 * The router command's description + body (mirrors prompts/rule.md).
 * Kept inline so the generator has no filesystem dependency.
 */
const ROUTER = {
  description: "Explicitly route a request through rule",
  argumentHint: "<request>",
  body: [
    "Process this request through the recommended rule workflow:",
    "",
    "$ARGUMENTS",
    "",
    "Strongly recommended sequence:",
    "1. Call MCP tool `pix_tool` with the complete request and project path/framework when known.",
    "2. Load the primary routed `rule-*` skill and only the necessary secondary skills.",
    "3. Use the returned skill/tool evidence as source of truth. Never invent APIs, files, dependencies, commands, requirements, or successful checks.",
    "4. If evidence is missing, call `pix_search`; if still missing, state uncertainty instead of guessing.",
    "5. Implement with failing tests first when code changes.",
    "6. Run `pix_check` against generated code. Fix every failure and rerun until all guardrails pass.",
    "7. Run project tests/typecheck. Report commands and real outcomes; never claim unexecuted checks passed.",
    "8. Finish by proposing a conventional commit message with a mandatory scope.",
    "",
    "Caveman is implicit: if the user is working in caveman mode, keep every response compressed.",
  ].join("\n"),
};

/**
 * The handoff command body (request-driven session handoff + atomic commits).
 * When the working tree is dirty, pending work is committed as a sequence of
 * scoped Conventional Commits, followed by a separate commit for pending decision
 * documents. The generated handoff is then written to docs/handoff/ and committed
 * on its own, so it survives the session instead of living only in the chat.
 * Commits stay local - the flow never pushes.
 */
const HANDOFF_BODY = [
  "Generate a session handoff and commit pending work: $ARGUMENTS",
  "",
  "1. Run `pix_process_handoff` (default mode `handoff`, all includes on). Pass any tokens from the arguments through unchanged (e.g. `close-session`, `compress`, `brief`, `no-diff`, `max=<n>`).",
  "2. If the working tree has pending changes, commit them BEFORE emitting the handoff as a sequence of ATOMIC commits:",
  "   a. Group changed files by concern (one coherent change per group).",
  "   b. Stage each group explicitly (pathspecs or `git add -p`) and commit with Conventional Commits AND a mandatory scope: `type(scope): subject` (e.g. `feat(cli): ...`, `chore(eslint): ...`). The `commit-msg` hook rejects scope-less messages.",
  "   c. After the code/config commits, make ONE SEPARATE final commit for decision documents already pending in the tree (ADR, CHANGELOG, docs/): `docs(adr): ...` or `docs(handoff): ...`.",
  "   d. NEVER push. Leave every commit local for review.",
  "3. Persist the handoff: write it to `docs/handoff/<NN>-<slug>.md` where NN is the next free two-digit number in that directory and <slug> is a kebab-case topic (e.g. `13-security-audit-remediation.md`). Open with the branch, the commit range it covers, and the date. Then commit that file ALONE - no other paths - as `chore(handoff): add session handoff <NN>-<slug>`. A handoff that exists only in the chat is lost when the session ends.",
  "4. Present the handoff as a paste-ready block for the next session, including the commit-scope convention reminder, the path of the handoff file, and the list of commits just created.",
  "5. If the grouping into atomic commits is ambiguous, ask the user how to split before committing.",
  "6. Caveman is implicit: if the user is working in caveman mode, keep the handoff and every response compressed.",
].join("\n");

/**
 * Uniform body for an area/workflow command: route through rule, honor the
 * TDD/a11y baseline, validate, and close with a scoped commit.
 *
 * @param {string} description - the prompt's registry description
 * @returns {string}
 */
function areaBody(description) {
  return [
    "Route this request through rule: $ARGUMENTS",
    "",
    `Scope: ${description}`,
    "",
    "1. Call `pix_tool` first to select the exact `rule-*` skill, then load the returned skill evidence as source of truth.",
    "2. Never invent APIs, files, dependencies, commands, or requirements not present in the evidence; if evidence is missing, call `pix_search` or state uncertainty.",
    "3. Baseline: write failing tests first (TDD) and cover a11y (WCAG 2.2 AA) where applicable; if there is no test/a11y surface, ask the user what to cover.",
    "4. Validate generated code with `pix_check`; iterate until all guardrails pass.",
    "5. Finish by proposing a conventional commit message with a mandatory scope.",
    "6. Caveman is implicit: if the user is working in caveman mode, keep the response compressed.",
  ].join("\n");
}

/**
 * A persona command's target: which role and which operation it runs.
 *
 * @param {string} name
 * @returns {{ role: string, roleName: string, operation: string }|null} null for non-persona commands
 */
function personaTarget(name) {
  for (const operation of OPERATIONS) {
    const prefix = `rule-${operation}-`;

    if (!name.startsWith(prefix)) {
      continue;
    }

    const roleId = name.slice(prefix.length);
    const role = activeRoles().find((entry) => entry.id === roleId);

    if (role) {
      return { role: role.id, roleName: role.role, operation };
    }
  }

  return null;
}

/**
 * Body for a persona command: it routes through the tools, not a hand-written
 * recap. `rule_tool_plan` hands back the operation contract for this role and
 * operation; `rule_tool_plan_docs` does the trio bookkeeping. Everything else is
 * judgment the agent fills in.
 *
 * @param {{ role: string, roleName: string, operation: string }} target
 * @returns {string}
 */
function personaBody(target) {
  const subject = `${target.operation} as a ${target.roleName}`;

  return [
    `${subject[0].toUpperCase() + subject.slice(1)}: $ARGUMENTS`,
    "",
    `1. Call \`rule_tool_plan\` with \`role=${target.role}\`, \`operation=${target.operation}\` and the request`,
    "   typed after this command passed through unchanged as `topic` - that text is this run's focus.",
    "   With no request after the command, omit topic and the focus is the whole project.",
    "2. Load the evidence skills the contract names and treat them as source of truth; never invent",
    "   APIs, files, dependencies, commands, or requirements not in the evidence.",
    `3. Perform the ${target.operation} the contract describes and gather what it needs - measure rather`,
    "   than assume, and quote commands and their output for every number.",
    `4. Call \`rule_tool_plan_docs\` with \`role=${target.role}\` and the findings to write/refresh the trio`,
    "   bookkeeping (headers, tables, statuses). Fill in the evidence, the finding wording and the steps.",
    "5. If a decision belongs to the user, stop and ask instead of guessing.",
    "6. Caveman is implicit: if the user is working in caveman mode, keep the response compressed.",
    "7. Finish by proposing a conventional commit with a mandatory scope for the documents this run",
    `   wrote, e.g. \`docs(${target.role}): ${target.operation}\`.`,
  ].join("\n");
}

/**
 * Full definition for a single command: name, description, argument hint, body.
 *
 * @param {string} name
 * @returns {{ name: string, description: string, argumentHint: string, body: string }}
 */
export function commandDefinition(name) {
  if (name === ROUTER_COMMAND) {
    return { name, description: ROUTER.description, argumentHint: ROUTER.argumentHint, body: ROUTER.body };
  }

  const prompt = listPrompts().find((p) => p.name === name);

  if (!prompt) {
    throw new Error(`Unknown command: ${name}`);
  }

  const primary = prompt.arguments?.[0];
  const argumentHint = primary ? (primary.required ? `<${primary.name}>` : `[${primary.name}]`) : "<request>";
  const persona = personaTarget(name);
  const body = persona ? personaBody(persona) : name === "rule-handoff" ? HANDOFF_BODY : areaBody(prompt.description);

  return { name, description: prompt.description, argumentHint, body };
}

/**
 * Every command definition, in canonical order.
 *
 * @returns {Array<{ name: string, description: string, argumentHint: string, body: string }>}
 */
export function listAgentCommands() {
  return commandNames().map((name) => commandDefinition(name));
}

/**
 * Render one command to a single agent format's file content.
 *
 * @param {{ name: string, description: string, argumentHint: string, body: string }} command
 * @param {"args"|"workflow"|"gemini"} format
 * @returns {string}
 */
export function renderAgentCommand(command, format) {
  const spec = FORMATS[format];

  if (!spec) {
    throw new Error(`Unknown agent command format: ${format}`);
  }

  const { name, description, argumentHint, body: rawBody } = command;
  const body = rawBody.replaceAll("$ARGUMENTS", spec.placeholder ?? ARGUMENTS_PROSE);

  if (spec.frontmatter === "toml") {
    return [`description = ${quoted(description)}`, 'prompt = """', body, '"""', ""].join("\n");
  }

  if (spec.frontmatter === "yaml") {
    // Claude Code / Pi / Cursor / Roo / VS Code prompt files all read this shape.
    return ["---", `description: ${quoted(description)}`, `argument-hint: "${argumentHint}"`, "---", body, ""].join(
      "\n",
    );
  }

  if (spec.frontmatter === "devin") {
    // Devin reads one directory per command, each containing a SKILL.md whose
    // name field is the slash command.
    return ["---", `name: /${name}`, `description: ${quoted(description)}`, "---", "", `# ${name}`, "", body, ""].join(
      "\n",
    );
  }
  // Prose-only workflow file (Windsurf, Cline).
  return [`# ${name}`, "", body, ""].join("\n");
}

/**
 * Render the full command set for a format as `{ filename, content }` pairs,
 * in canonical order. Callers own the actual filesystem writes.
 *
 * @param {"args"|"workflow"|"gemini"} format
 * @returns {Array<{ name: string, filename: string, content: string }>}
 */
export function renderAgentCommandFiles(format) {
  const ext = FORMAT_EXT[format];

  if (!ext) {
    throw new Error(`Unknown agent command format: ${format}`);
  }

  return listAgentCommands().map((command) => ({
    name: command.name,
    filename: `${command.name}${ext}`,
    content: renderAgentCommand(command, format),
  }));
}
