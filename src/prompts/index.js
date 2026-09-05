/**
 * @module prompts/index
 *
 * MCP Prompt registry for rule-mcp.
 * Provides reusable prompt templates that guide agents through rule AI
 * workflow phases: 5 one-shot workflow prompts (orchestrate multiple tools),
 * 15 area prompts (one per tool area), and 3 legacy prompts.
 *
 * Every prompt:
 *   - routes through the pix_tool dispatcher to the right rule-* skill
 *   - involves TDD/a11y baselines (or asks the user what to cover)
 *   - closes by proposing a conventional commit message with mandatory scope
 *
 * @see https://spec.modelcontextprotocol.io/specification/2025-04-01/#prompts
 */

import { parseHandoffOptions, HANDOFF_USAGE } from "./handoff-options.js";
import { activeRoles, roleById } from "../core/review-roles.js";
import { fillRoleTemplate, OPERATIONS } from "../core/review-roles-template.js";

/** Tokens that trigger the generic per-prompt help message. */
const HELP_TOKENS = new Set(["help", "--help", "-h"]);

/**
 * Examples shown by the generic `/rule-* help` message, keyed by prompt name.
 */
const PROMPT_EXAMPLES = {
  "rule-area-ai": ["/rule-area-ai help", "/rule-area-ai add a web-search tool to the agent"],
  "rule-area-backend": ["/rule-area-backend help", "/rule-area-backend express REST API with zod validation"],
  "rule-area-data": ["/rule-area-data help", "/rule-area-data postgresql schema for the users table"],
  "rule-area-devops": ["/rule-area-devops help", "/rule-area-devops multi-stage docker build for node"],
  "rule-area-frontend": ["/rule-area-frontend help", "/rule-area-frontend react login form with validation"],
  "rule-area-meta": ["/rule-area-meta help", "/rule-area-meta search for the a11y skill"],
  "rule-area-platform": ["/rule-area-platform help", "/rule-area-platform electron desktop app scaffold"],
  "rule-area-process": ["/rule-area-process help", "/rule-area-process run a code review on the pending changes"],
  "rule-area-skills": ["/rule-area-skills help", "/rule-area-skills find a skill for docker"],
  "rule-area-styleguide": ["/rule-area-styleguide help", "/rule-area-styleguide check this HTML for semantics"],
  "rule-area-toolchain": ["/rule-area-toolchain help", "/rule-area-toolchain set up vite + biome"],
  "rule-area-ui": ["/rule-area-ui help", "/rule-area-ui design-system button component"],
  "rule-handoff": ["/rule-handoff help", "/rule-handoff close-session"],
  "rule-process-check": ["/rule-process-check help", "/rule-process-check the current diff"],
};

/**
 * Build the generic `/rule-* help` message for a prompt definition.
 *
 * @param {string} name - prompt name
 * @param {{ description: string, arguments: Array<{ name: string, description: string, required?: boolean }> }} def - prompt definition
 * @param {string[]} [examples] - example invocations
 * @returns {string} - the help block the model should present verbatim
 */
function buildHelpMessage(name, def, examples = []) {
  const argumentList = def.arguments.map((a) => (a.required ? `<${a.name}>` : `[${a.name}]`)).join(" ");
  const lines = [
    `Usage: /${name} ${argumentList}`,
    "",
    def.description,
    "",
    ...def.arguments.map((a) => `  ${a.name}  ${a.description}`),
  ];

  if (examples.length > 0) {
    lines.push("", "Examples:", ...examples.map((e) => `  ${e}`));
  }

  return lines.join("\n");
}

/**
 * Shared system text for the 15 area prompts.
 *
 * @param {string} area - area name (e.g. "frontend")
 * @param {string} tools - comma-separated rule_tool_* tools of the area
 */
function areaPromptText(area, tools) {
  const lines = [
    `You are the ${area} area specialist for rule-mcp.`,
    `Route this request through \`pix_tool\` first to pick the exact rule-* skill, then load the returned skill evidence as source of truth: ${tools}.`,
    "The request is free text: extract the target framework/platform/database/tool from it when present; never invent APIs, files, dependencies, commands, or requirements not present in the skill evidence.",
    "Baseline: involve TDD (write failing tests first) and a11y (WCAG 2.2 AA, axe-core where applicable). If the request has no test/a11y surface, ask the user what to cover before finishing.",
    "Validate generated code with `rule_tool_check` and iterate until all guardrails pass.",
    "Caveman is implicit: if the user is working in caveman mode, keep the response compressed.",
    `When the work is done, propose a conventional commit message with a mandatory scope, e.g. "feat(${area}): ...".`,
  ];

  return lines.join("\n");
}

/**
 * List all available prompts with their descriptions and argument schemas.
 *
 * @returns {Array<{ name: string, description: string, arguments: Array<{ name: string, description: string, required?: boolean }> }>}
 */
export function listPrompts() {
  return [
    {
      name: "rule-area-ai",
      description: "AI agent work: rule-ai-agents patterns for agent integrations",
      arguments: [{ name: "request", description: "Agent integration task", required: true }],
    },

    {
      name: "rule-area-backend",
      description: "Backend/API work: node, express, fastify, hono, nestjs, graphql, api design, security",
      arguments: [
        {
          name: "request",
          description: 'Endpoint, service, or backend task (free text: include framework, e.g. "express REST API")',
          required: true,
        },
      ],
    },
    {
      name: "rule-area-data",
      description: "Data-layer work: postgresql, mysql, sqlite, mongodb, duckdb, indexed-db, SQL",
      arguments: [
        {
          name: "request",
          description: 'Schema, query, or data-layer task (free text: include database, e.g. "postgresql users table")',
          required: true,
        },
      ],
    },
    {
      name: "rule-area-devops",
      description: "DevOps work: docker, gitlab-ci, observability, testing, versioning",
      arguments: [
        { name: "request", description: "CI/CD, container, observability, or versioning task", required: true },
      ],
    },
    {
      name: "rule-area-frontend",
      description: "Frontend work following rule styleguides: zero CSS classes, semantic HTML, external CSS, TDD + a11y",
      arguments: [
        {
          name: "request",
          description: 'Component, page, or frontend task (free text: include framework, e.g. "react login form")',
          required: true,
        },
      ],
    },
    {
      name: "rule-handoff",
      description:
        "Produce a compressed context handoff (ADR summary + git context) to resume in a new session, commiting pending work as scoped Conventional Commits first. Usage: /rule-handoff [options] or /rule-handoff help - no arguments = quick handoff",
      arguments: [
        {
          name: "options",
          description:
            "Space-separated tokens: handoff | close-session (default: handoff), compress | no-compress (default: compress), full | brief | minimal (default: full), no-diff, no-log, no-context, no-adrs, no-roadmap, max=<n> (default: 0), or help. Empty = all defaults.",
          required: false,
        },
      ],
    },
    {
      name: "rule-area-meta",
      description:
        "Work with the rule dispatcher/action toolset: routing, gateway, apply, search, check, scaffold, detect, fix, ADR, handoff",
      arguments: [
        { name: "request", description: "What to route, search, validate, scaffold, or record", required: true },
      ],
    },
    {
      name: "rule-area-platform",
      description: "Platform work: web, desktop, expo, agent, library",
      arguments: [
        {
          name: "request",
          description: 'Platform target or task (free text: include platform, e.g. "electron desktop app")',
          required: true,
        },
      ],
    },
    {
      name: "rule-area-process",
      description: "Process work: code review, TDD, feature workflow, documentation, ADR, handoff, BMAD",
      arguments: [
        { name: "request", description: "Review, TDD, workflow, documentation, or decision task", required: true },
      ],
    },
    {
      name: "rule-area-skills",
      description: "Skill discovery: find, install, and evaluate agent skills",
      arguments: [{ name: "request", description: "Skill you are looking for", required: true }],
    },
    {
      name: "rule-area-styleguide",
      description: "Styleguide work: a11y, css, html, javascript, json, markdown, naming, patterns, validation",
      arguments: [{ name: "request", description: "Styleguide check or authoring task", required: true }],
    },
    {
      name: "rule-area-toolchain",
      description:
        "Toolchain configuration: vite, pnpm, turborepo, rspack, parcel, typescript, eslint, biome, husky, commits, project",
      arguments: [
        {
          name: "request",
          description: 'Toolchain config or setup task (free text: include tool, e.g. "vite + biome")',
          required: true,
        },
      ],
    },
    {
      name: "rule-area-ui",
      description: "UI design-system work: design-system components, tokens, patterns",
      arguments: [{ name: "request", description: "UI/design-system task", required: true }],
    },
    {
      name: "rule-adr",
      description: "Record an architecture decision: context, decision, alternatives, consequences",
      arguments: [
        { name: "decision", description: "The decision to record (free text: what changed and why)", required: true },
      ],
    },
    {
      name: "rule-process-check",
      description: "Validate code against the rule guardrails and fix what fails",
      arguments: [
        {
          name: "target",
          description: "What to check (free text: paths, or the current diff). Default: the current diff.",
          required: false,
        },
      ],
    },
    {
      name: "rule-flight",
      description: "Read the flight recorder: what this server cost, and what to do about it",
      arguments: [
        {
          name: "options",
          description: "Space-separated: export, show <file>, prune, redact. Default: export.",
          required: false,
        },
      ],
    },
    {
      name: "rule-handon",
      description: "Resume: verify the last handoff against the repository as it is now",
      arguments: [
        {
          name: "options",
          description: "Space-separated: list, file=<path>. Default: the newest handoff.",
          required: false,
        },
      ],
    },
    {
      name: "rule-init",
      description: "Prepare a project for rule-mcp: the central recorder directory and tokensave",
      arguments: [
        { name: "options", description: "Space-separated: no-tokensave. Default: the full init.", required: false },
      ],
    },
    {
      name: "rule-update",
      description: "Apply an available server update explicitly, and report what changed",
      arguments: [
        {
          name: "options",
          description: "Space-separated: check (report only). Default: apply the update.",
          required: false,
        },
      ],
    },
    ...rolePrompts(),
  ].sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * One prompt per active review persona per operation, generated from the
 * registry: `rule-plan-<role>`, `rule-audit-<role>`, `rule-review-<role>` - 21
 * persona commands for the 7 active roles.
 *
 * The names are shared with the agent commands on purpose: the command
 * generator derives its set from this registry, so a second name for the same
 * operation would be the drift ADR 029 removed.
 *
 * @returns {Array<{ name: string, description: string, arguments: object[] }>}
 */
function rolePrompts() {
  const verb = { plan: "Plan", audit: "Audit", review: "Review" };

  return activeRoles().flatMap((role) =>
    OPERATIONS.map((operation) => ({
      name: `rule-${operation}-${role.id}`,
      description: `${verb[operation]} as a ${role.role} with ${role.yearsOfExperience} years of experience`,
      arguments: [
        {
          name: "topic",
          description: "Focus for this run (free text). Default: the whole project.",
          required: false,
        },
      ],
    })),
  );
}

/**
 * Whether MCP prompts are currently suppressed.
 *
 * Claude Code exposes MCP prompts as `/<server>:<prompt> (MCP)` and offers no
 * client-side way to hide them. The installer ships clean `/rule-*` user
 * commands for Claude and sets this flag so the prefixed prompt duplicates are
 * not also listed. `listPrompts()` itself stays pure (the full registry) - only
 * `listActivePrompts()` honors the flag.
 *
 * @returns {boolean}
 */
export function promptsSuppressed() {
  return process.env.RULE_MCP_NO_PROMPTS === "1";
}

/**
 * The prompts the server should advertise: the full registry, or an empty list
 * when suppression is active.
 *
 * @returns {ReturnType<typeof listPrompts>}
 */
export function listActivePrompts() {
  return promptsSuppressed() ? [] : listPrompts();
}

/**
 * Get a specific prompt by name with its system message content.
 *
 * @param {string} name - Prompt name
 * @param {Record<string, string>} [args] - Prompt arguments from the client
 * @returns {{ name: string, description: string, messages: Array<{ role: string, content: { type: string, text: string } }> }|null}
 */
export function getPrompt(name, args = {}) {
  const user = (text) => [{ role: "user", content: { type: "text", text } }];

  // ── Generic `/rule-* help` ──────────────────────────────────────
  // Any prompt whose primary argument is `help` (or --help / -h) returns
  // its usage block instead of running a task.
  const def = listPrompts().find((p) => p.name === name);
  const primary = def?.arguments?.[0];
  const primaryValue = primary ? args?.[primary.name] : undefined;

  if (primaryValue !== undefined && HELP_TOKENS.has(String(primaryValue).trim().toLowerCase())) {
    // Help is returned as a ready-made assistant message: the client displays it
    // immediately instead of asking the model to generate it (no reasoning, no tokens).
    const helpText = name === "rule-handoff" ? HANDOFF_USAGE : buildHelpMessage(name, def, PROMPT_EXAMPLES[name] ?? []);

    return {
      name,
      description: `${name} usage`,
      messages: [{ role: "assistant", content: { type: "text", text: helpText } }],
    };
  }

  // ── Review personas: one prompt per active role and operation, filled from the registry ──
  const personaOp = /^rule-(plan|audit|review)-/.exec(name);

  if (personaOp) {
    const operation = personaOp[1];
    const role = roleById(name.slice(`rule-${operation}-`.length));

    if (role) {
      return {
        name,
        description: `${operation[0].toUpperCase() + operation.slice(1)} as a ${role.role}`,
        messages: user(fillRoleTemplate(role, { operation, topic: args?.topic })),
      };
    }
  }

  // ── One-shot workflow prompts ──────────────────────────────────
  switch (name) {
    case "rule-handoff": {
      const options = parseHandoffOptions(args?.options);

      const includeFlags = [
        `${options.includeGitDiff ? "includeGitDiff=yes" : "includeGitDiff=no"}`,
        `${options.includeGitLog ? "includeGitLog=yes" : "includeGitLog=no"}`,
        `${options.includeContext ? "includeContext=yes" : "includeContext=no"}`,
        `${options.includeAdrs ? "includeAdrs=yes" : "includeAdrs=no"}`,
        `${options.includeRoadmap ? "includeRoadmap=yes" : "includeRoadmap=no"}`,
      ].join(", ");

      return {
        name,
        description: "Produce a compressed context handoff",
        messages: user(
          "You are a handoff specialist for rule-mcp.\n" +
            "The user invoked `/rule-handoff`; every option is optional and defaults are applied server-side. The requested options are already resolved here into exact tool arguments - do not reinterpret them.\n" +
            "Resolved arguments for `rule_tool_process_handoff` (mode: handoff | close-session):\n" +
            `- mode=${options.mode}\n` +
            `- compress=${options.compress ? "true" : "false"}\n` +
            `- format=${options.format}\n` +
            `- ${includeFlags}\n` +
            `- maxTokens=${options.maxTokens}\n` +
            "Step 1 - Commit pending work FIRST, before running the handoff tool:\n" +
            "  a. If the working tree has uncommitted changes, group them by concern and stage each group explicitly (pathspecs or `git add -p`).\n" +
            "  b. Commit each group atomically with Conventional Commits AND a mandatory scope: `type(scope): subject` (e.g. `feat(cli): ...`, `chore(eslint): ...`). The `commit-msg` hook rejects scope-less messages - a scope is never optional.\n" +
            "  c. Make ONE SEPARATE final commit for decision documents already pending in the tree (ADR, CHANGELOG, docs/): `docs(adr): ...` or `docs(handoff): ...`.\n" +
            "  d. NEVER push. Leave every commit local for review.\n" +
            "  e. If the grouping into atomic commits is ambiguous, ask the user how to split before committing.\n" +
            "Step 2 - Run `rule_tool_process_handoff` with EXACTLY the resolved arguments above; do not change them.\n" +
            "Include the ADR summary (docs/adr) and git context in the output.\n" +
            "Step 3 - Persist the handoff: write its text to `docs/handoff/<NN>-<slug>.md` where NN is the next free two-digit number and <slug> is kebab-case (e.g. `13-security-audit-remediation.md`). Open with the branch, the commit range it covers, and the date. Then commit that file ALONE - no other paths - as `chore(handoff): add session handoff <NN>-<slug>`. A handoff that exists only in the chat is lost when the session ends.\n" +
            "Step 4 - Present the handoff as a paste-ready block for the next session, including the commit-scope convention reminder, the path of the handoff file, and the list of commits just created.\n" +
            "If the resolved arguments are ambiguous, ask the user which parts to include.\n" +
            "Finish by listing the commits just made (or proposing the next conventional commit message with a mandatory scope if nothing needed committing).",
        ),
      };
    }

    default: {
      break;
    }
  }

  // ── Area prompts ───────────────────────────────────────────────
  const AREAS = {
    "rule-area-meta": areaPromptText(
      "meta",
      "pix_tool, rule_tool_gateway, rule_tool_apply, rule_tool_search, rule_tool_check, rule_tool_scaffold, rule_tool_detect, rule_tool_fix, rule_tool_process_adr, rule_tool_process_handoff",
    ),
    "rule-area-frontend": areaPromptText(
      "frontend",
      "pix_frontend_react, pix_frontend_vue, pix_frontend_svelte, pix_frontend_angular, pix_frontend_solidjs, pix_frontend_astro, pix_frontend_meta_next, pix_frontend_meta_nuxt, pix_frontend_meta_remix, pix_frontend_vanilla_reactive, pix_frontend_design",
    ),
    "rule-area-backend": areaPromptText(
      "backend",
      "pix_backend_node, pix_backend_express, pix_backend_fastify, pix_backend_hono, pix_backend_nestjs, pix_backend_graphql, pix_backend_api_design, pix_backend_security",
    ),
    "rule-area-data": areaPromptText(
      "data",
      "pix_data_postgresql, pix_data_mysql, pix_data_sqlite, pix_data_mongodb, pix_data_duckdb, pix_data_indexed_db, pix_data_sql",
    ),
    "rule-area-toolchain": areaPromptText(
      "toolchain",
      "pix_toolchain_vite, pix_toolchain_pnpm, pix_toolchain_turborepo, pix_toolchain_rspack, pix_toolchain_parcel, pix_toolchain_typescript, pix_toolchain_eslint, pix_toolchain_biome, pix_toolchain_husky, pix_toolchain_commits, pix_toolchain_project",
    ),
    "rule-area-styleguide": areaPromptText(
      "styleguide",
      "pix_styleguide_a11y, pix_styleguide_css, pix_styleguide_html, pix_styleguide_javascript, pix_styleguide_json, pix_styleguide_markdown, pix_styleguide_naming, pix_styleguide_patterns, pix_styleguide_validation",
    ),
    "rule-area-process": areaPromptText(
      "process",
      "pix_process_code_review, pix_process_tdd, pix_process_feature_workflow, pix_process_documentation, pix_process_bmad, rule_tool_process_adr, rule_tool_process_handoff",
    ),
    "rule-area-devops": areaPromptText(
      "devops",
      "pix_devops_docker, pix_devops_gitlab_ci, pix_devops_observability, pix_devops_testing, pix_devops_version",
    ),
    "rule-area-platform": areaPromptText(
      "platform",
      "pix_platform_web, pix_platform_desktop, pix_platform_expo, pix_platform_agent, pix_platform_library",
    ),
    "rule-area-ai": areaPromptText("ai", "pix_ai_agents"),
    "rule-area-skills": areaPromptText("skills", "pix_find_skills"),
    "rule-area-ui": areaPromptText("ui", "pix_ui_design_system"),
  };

  if (AREAS[name]) {
    return { name, description: name, messages: user(AREAS[name]) };
  }

  // ── Legacy prompts (updated to the shared rules) ───────────────
  switch (name) {
    case "rule-adr": {
      return {
        name,
        description: "Record an architecture decision",
        messages: user(
          [
            "Record this decision as an ADR:",
            "",
            args.decision ?? "",
            "",
            "1. Call `rule` first, then `rule_tool_process_adr` - it auto-numbers and maintains the index.",
            "2. Context states the forcing factors, not the history. Decision states what is true now.",
            "3. List the alternatives you actually considered and why each lost.",
            "4. Consequences name the cost as well as the benefit, including what tests now enforce it.",
            "5. If an earlier ADR is reversed in part, mark it superseded and link both ways.",
            "6. Ask the user rather than guessing when the decision is theirs to make.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope, e.g. `docs(adr): ...`.",
          ].join("\n"),
        ),
      };
    }

    case "rule-process-check": {
      return {
        name,
        description: "Validate code against the guardrails",
        messages: user(
          [
            `Validate this against the rule guardrails: ${args.target ?? "the current diff"}.`,
            "",
            "1. Call `rule` to route, then `rule_tool_check` per file - input above 256 KiB is refused, so check",
            "   source files in units rather than bundles.",
            "2. Fix every reported failure and re-run until `allPass` is true. Do not silence a rule; a suppression",
            "   is acceptable only when it states its reason.",
            "3. Run the project's tests and report the commands you actually executed.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope, e.g. `fix(guardrails): ...`.",
          ].join("\n"),
        ),
      };
    }

    case "rule-flight": {
      return {
        name,
        description: "Read the flight recorder",
        messages: user(
          [
            `Report what this server cost. Options: ${args.options ?? "export"}.`,
            "",
            "1. `rule-mcp telemetry export` writes one .flight and empties the local log; add `--redact`",
            "   for a copy that carries no prompt text and no absolute paths before sharing it.",
            "2. `telemetry show <file>` renders an existing recording; `telemetry prune` rolls up and applies",
            "   retention to both the log and exports/.",
            "3. Read the KPI block: measured savings, reminder overhead, cache hit rate, error rate, latency.",
            "4. Say what the numbers justify changing. A claim the recorder does not support is not a finding;",
            "   ask the user before acting on an ambiguous one.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope, e.g. `docs(telemetry): ...`.",
          ].join("\n"),
        ),
      };
    }

    case "rule-handon": {
      return {
        name,
        description: "Verify the last handoff against the repository now",
        messages: user(
          [
            "Call `rule_tool_process_handon` for this project (or `rule-mcp handon --dir .`).",
            "",
            "1. Every claim it returns carries its own verdict: act on what is still true, re-derive what changed,",
            "   and treat unverified as unknown.",
            "2. Start from the suggested first move unless the user asks for something else.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope if the repo changed.",
          ].join("\n"),
        ),
      };
    }

    case "rule-init": {
      return {
        name,
        description: "Prepare a project for rule-mcp",
        messages: user(
          [
            `Initialise this project for rule-mcp. Options: ${args.options ?? "the full init"}.`,
            "",
            "1. Run `rule-mcp init` - it prepares this project's directory under the state dir,",
            "   moves a local `./.rule-mcp` left by an earlier version, and runs tokensave init",
            "   unless told not to.",
            "2. For a brand-new project with no config yet (absorbed from the removed rule-setup-project),",
            "   bootstrap it first: `rule_tool_detect` to detect the stack, `rule_tool_scaffold` for the",
            "   project config files, and the toolchain area for the tooling setup before step 3.",
            "3. Confirm nothing was written into the repository: the recording lives in the state directory,",
            "   so the project needs no ignore rule and no git hook.",
            "4. Check the project's test setup exists; if there is no test surface, ask the user what to cover.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope, e.g. `chore(init): ...`.",
          ].join("\n"),
        ),
      };
    }

    case "rule-update": {
      return {
        name,
        description: "Apply an available server update",
        messages: user(
          [
            `Update the server. Options: ${args.options ?? "apply the update"}.`,
            "",
            "1. Updates are notify-only by default: the banner announces what is available and the merge happens",
            "   explicitly, via `rule_tool_update` or `rule-mcp update`.",
            "2. Report the commit range that was merged and whether skills or server code changed - code changes",
            "   schedule a restart.",
            "3. Run the project's tests afterwards and report the real outcome, not an assumed one.",
            "4. If the update is refused (remote not allowed, dirty tree, unsigned upstream), say which gate",
            "   refused it and ask the user before working around it.",
            "",
            "Finish by proposing a conventional commit with a mandatory scope if anything in the repo changed.",
          ].join("\n"),
        ),
      };
    }
    default: {
      return null;
    }
  }
}
