/**
 * @module prompts/index
 *
 * MCP Prompt registry for pix-galaxy-mcp.
 * Provides reusable prompt templates that guide agents through pix AI
 * workflow phases: 5 one-shot workflow prompts (orchestrate multiple tools),
 * 15 area prompts (one per tool area), and 3 legacy prompts.
 *
 * Every prompt:
 *   - routes through the pix_tool dispatcher to the right pix-* skill
 *   - involves TDD/a11y baselines (or asks the user what to cover)
 *   - closes by proposing a conventional commit message with mandatory scope
 *
 * @see https://spec.modelcontextprotocol.io/specification/2025-04-01/#prompts
 */

import { parseHandoffOptions, HANDOFF_USAGE } from "./handoff-options.js";

/** Tokens that trigger the generic per-prompt help message. */
const HELP_TOKENS = new Set(["help", "--help", "-h"]);

/**
 * Examples shown by the generic `/pix-* help` message, keyed by prompt name.
 */
const PROMPT_EXAMPLES = {
  "pix-a11y-audit": ["/pix-a11y-audit help", "/pix-a11y-audit review the login form for WCAG 2.2 AA"],
  "pix-ai": ["/pix-ai help", "/pix-ai add a web-search tool to the agent"],
  "pix-backend": ["/pix-backend help", "/pix-backend express REST API with zod validation"],
  "pix-caveman": ["/pix-caveman help", "/pix-caveman write a commit for the pending changes"],
  "pix-code-review": ["/pix-code-review help", "/pix-code-review review this component for styleguide compliance"],
  "pix-data": ["/pix-data help", "/pix-data postgresql schema for the users table"],
  "pix-devops": ["/pix-devops help", "/pix-devops multi-stage docker build for node"],
  "pix-frontend": ["/pix-frontend help", "/pix-frontend react login form with validation"],
  "pix-handoff": ["/pix-handoff help", "/pix-handoff close-session"],
  "pix-meta": ["/pix-meta help", "/pix-meta search for the a11y skill"],
  "pix-new-feature": ["/pix-new-feature help", "/pix-new-feature add dark mode to the header (react, include tests)"],
  "pix-platform": ["/pix-platform help", "/pix-platform electron desktop app scaffold"],
  "pix-process": ["/pix-process help", "/pix-process run a code review on the pending changes"],
  "pix-pull-request": ["/pix-pull-request help", "/pix-pull-request login form with tests and ADR"],
  "pix-setup-project": ["/pix-setup-project help", "/pix-setup-project my-app vite react"],
  "pix-skills": ["/pix-skills help", "/pix-skills find a skill for docker"],
  "pix-styleguide": ["/pix-styleguide help", "/pix-styleguide check this HTML for semantics"],
  "pix-tdd": ["/pix-tdd help", "/pix-tdd write failing tests for the shopping cart"],
  "pix-toolchain": ["/pix-toolchain help", "/pix-toolchain set up vite + biome"],
  "pix-ui": ["/pix-ui help", "/pix-ui design-system button component"],
  "pix-write-tests": ["/pix-write-tests help", "/pix-write-tests a11y tests for the modal (component)"],
};

/**
 * Build the generic `/pix-* help` message for a prompt definition.
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
 * @param {string} tools - comma-separated pix_tool_* tools of the area
 */
function areaPromptText(area, tools) {
  const lines = [
    `You are the ${area} area specialist for pix-galaxy-mcp.`,
    `Route this request through \`pix_tool\` first to pick the exact pix-* skill, then load the returned skill evidence as source of truth: ${tools}.`,
    "The request is free text: extract the target framework/platform/database/tool from it when present; never invent APIs, files, dependencies, commands, or requirements not present in the skill evidence.",
    "Baseline: involve TDD (write failing tests first) and a11y (WCAG 2.2 AA, axe-core where applicable). If the request has no test/a11y surface, ask the user what to cover before finishing.",
    "Validate generated code with `pix_tool_check` and iterate until all guardrails pass.",
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
      name: "pix-a11y-audit",
      description:
        "Audit a11y end-to-end: review code for WCAG 2.2 AA compliance and generate Playwright + axe-core tests",
      arguments: [
        {
          name: "code",
          description: "Code to review for a11y compliance (free text: include framework/component if relevant)",
          required: true,
        },
      ],
    },
    {
      name: "pix-ai",
      description: "AI agent work: pix-ai-agents patterns for agent integrations",
      arguments: [{ name: "request", description: "Agent integration task", required: true }],
    },

    {
      name: "pix-backend",
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
      name: "pix-caveman",
      description: "Ultra-compressed communication and review: caveman modes, compressed commits, compressed reviews",
      arguments: [
        {
          name: "request",
          description: "Text to compress, or commit/review to write in caveman style",
          required: true,
        },
      ],
    },
    {
      name: "pix-code-review",
      description: "Review code against pix styleguides",
      arguments: [
        { name: "code", description: "Code to review (free text: include framework if relevant)", required: true },
      ],
    },
    {
      name: "pix-data",
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
      name: "pix-devops",
      description: "DevOps work: docker, gitlab-ci, observability, testing, versioning",
      arguments: [
        { name: "request", description: "CI/CD, container, observability, or versioning task", required: true },
      ],
    },
    {
      name: "pix-frontend",
      description: "Frontend work following pix styleguides: zero CSS classes, semantic HTML, external CSS, TDD + a11y",
      arguments: [
        {
          name: "request",
          description: 'Component, page, or frontend task (free text: include framework, e.g. "react login form")',
          required: true,
        },
      ],
    },
    {
      name: "pix-handoff",
      description:
        "Produce a compressed context handoff (ADR summary + git context) to resume in a new session. Usage: /pix-handoff [options] or /pix-handoff help - no arguments = quick handoff",
      arguments: [
        {
          name: "options",
          description:
            "Space-separated tokens: handoff | close-session (default: handoff), compress, full | brief | minimal (default: full), no-diff, no-log, no-context, no-adrs, no-roadmap, max=<n> (default: 0), or help. Empty = all defaults.",
          required: false,
        },
      ],
    },
    {
      name: "pix-meta",
      description:
        "Work with the pix dispatcher/action toolset: routing, gateway, apply, search, check, scaffold, detect, fix, ADR, handoff",
      arguments: [
        { name: "request", description: "What to route, search, validate, scaffold, or record", required: true },
      ],
    },
    {
      name: "pix-new-feature",
      description:
        "Implement a feature end-to-end: route → evidence → failing tests → code → guardrails → tests → commit scope",
      arguments: [
        {
          name: "feature",
          description:
            'Feature description or requirement (free text: include framework/area and "no tests" to skip TDD/a11y tests)',
          required: true,
        },
      ],
    },
    {
      name: "pix-platform",
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
      name: "pix-process",
      description: "Process work: code review, feature workflow, documentation, ADR, handoff, BMAD",
      arguments: [
        { name: "request", description: "Review, workflow, documentation, or decision task", required: true },
      ],
    },
    {
      name: "pix-pull-request",
      description:
        "Prepare a pull request: review + a11y + security, update the ADR, commit with scope, PR description",
      arguments: [
        {
          name: "description",
          description:
            'What changed / PR summary (free text: append "no adr" to skip the Architecture Decision Record)',
          required: true,
        },
      ],
    },
    {
      name: "pix-setup-project",
      description:
        "Bootstrap a project end-to-end: detect framework, scaffold config, toolchain, and context-pack generation",
      arguments: [
        {
          name: "projectName",
          description: 'Project name (free text: append framework/toolchain/tier, e.g. "my-app vite react")',
          required: true,
        },
      ],
    },
    {
      name: "pix-skills",
      description: "Skill discovery: find, install, and evaluate agent skills",
      arguments: [{ name: "request", description: "Skill you are looking for", required: true }],
    },
    {
      name: "pix-styleguide",
      description: "Styleguide work: a11y, css, html, javascript, json, markdown, naming, patterns, validation",
      arguments: [{ name: "request", description: "Styleguide check or authoring task", required: true }],
    },
    {
      name: "pix-tdd",
      description: "Test-driven development workflow: red → green → refactor, failing tests first",
      arguments: [{ name: "request", description: "Feature or bugfix to develop test-first", required: true }],
    },
    {
      name: "pix-toolchain",
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
      name: "pix-ui",
      description: "UI design-system work: design-system components, tokens, patterns",
      arguments: [{ name: "request", description: "UI/design-system task", required: true }],
    },
    {
      name: "pix-write-tests",
      description: "Write tests: TDD unit tests, a11y Playwright + axe-core specs, and devops test setup",
      arguments: [
        {
          name: "scope",
          description: "What to test (free text: include test type - tdd, a11y, devops, all)",
          required: true,
        },
      ],
    },
  ];
}

/**
 * Whether MCP prompts are currently suppressed.
 *
 * Claude Code exposes MCP prompts as `/<server>:<prompt> (MCP)` and offers no
 * client-side way to hide them. The installer ships clean `/pix-*` user
 * commands for Claude and sets this flag so the prefixed prompt duplicates are
 * not also listed. `listPrompts()` itself stays pure (the full registry) - only
 * `listActivePrompts()` honours the flag.
 *
 * @returns {boolean}
 */
export function promptsSuppressed() {
  return process.env.PIX_GALAXY_MCP_NO_PROMPTS === "1";
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

  // ── Generic `/pix-* help` ──────────────────────────────────────
  // Any prompt whose primary argument is `help` (or --help / -h) returns
  // its usage block instead of running a task.
  const def = listPrompts().find((p) => p.name === name);
  const primary = def?.arguments?.[0];
  const primaryValue = primary ? args?.[primary.name] : undefined;
  if (primaryValue !== undefined && HELP_TOKENS.has(String(primaryValue).trim().toLowerCase())) {
    // Help is returned as a ready-made assistant message: the client displays it
    // immediately instead of asking the model to generate it (no reasoning, no tokens).
    const helpText = name === "pix-handoff" ? HANDOFF_USAGE : buildHelpMessage(name, def, PROMPT_EXAMPLES[name] ?? []);
    return {
      name,
      description: `${name} usage`,
      messages: [{ role: "assistant", content: { type: "text", text: helpText } }],
    };
  }

  // ── One-shot workflow prompts ──────────────────────────────────
  switch (name) {
    case "pix-setup-project": {
      return {
        name,
        description: "Bootstrap a project end-to-end",
        messages: user(
          "You are a project bootstrap specialist for pix-galaxy-mcp.\n" +
            "Sequence:\n" +
            "1. Call `pix_tool_detect` on the project path (or use the framework name from the request text) to detect the stack.\n" +
            "2. Route through `pix_tool` with the detected framework to load the primary pix-* skill evidence.\n" +
            "3. Call `pix_tool_scaffold` for the project config files, then `pix_toolchain_project` (or the area toolchain skill) for tooling setup.\n" +
            "4. Generate the project context pack (`.context/`) with the pix-galaxy-architect web app (or its SDK) at the requested tier.\n" +
            "5. Validate every generated file with `pix_tool_check` and iterate until all guardrails pass.\n" +
            "Baseline: if the scaffold produces code, include failing tests first (TDD) and a11y checks; if not applicable, ask the user what to cover.\n" +
            'Finish by proposing a conventional commit message with a mandatory scope, e.g. "chore(setup): ...".',
        ),
      };
    }

    case "pix-new-feature": {
      return {
        name,
        description: "Implement a feature end-to-end",
        messages: user(
          "You are a feature-implementation specialist for pix-galaxy-mcp.\n" +
            "Sequence:\n" +
            "1. Route the feature through `pix_tool` (extract framework/area from the request text when present) and load the routed skill evidence as source of truth.\n" +
            "2. If a feature-workflow skill applies (pix_process_feature_workflow or BMAD), run it first to define scope.\n" +
            "3. Write failing tests first (TDD) for the feature; include a11y tests (Playwright + axe-core) when the change has UI surface.\n" +
            "4. Implement against the skill evidence; call `pix_tool_component` for component templates when applicable.\n" +
            "5. Run `pix_tool_check` against the generated code and iterate until all guardrails pass.\n" +
            "6. Run the project tests/typecheck and report real outcomes.\n" +
            "If the request is ambiguous, ask the user what to cover before finishing.\n" +
            'Finish by proposing a conventional commit message with a mandatory scope, e.g. "feat(<area>): <summary>".',
        ),
      };
    }

    case "pix-pull-request": {
      return {
        name,
        description: "Prepare a pull request (review + ADR + commit scope + description)",
        messages: user(
          "You are a pull-request specialist for pix-galaxy-mcp.\n" +
            "Sequence:\n" +
            "1. Review the changes: run the code-review skill (`pix_process_code_review`), caveman review (`pix_caveman_review`), a11y review (`pix_styleguide_a11y`), and backend security review (`pix_backend_security`) when the change touches those surfaces.\n" +
            "2. Fix every guardrail failure with `pix_tool_check` until all pass.\n" +
            '3. Generate or update the Architecture Decision Record with `pix_tool_process_adr` for any structural decision (updated by default; append "no adr" to the request to skip).\n' +
            "4. Ensure the work includes tests (TDD + a11y where applicable); if missing, flag it and ask the user.\n" +
            "5. Write the PR description: summary, why, test evidence, and any ADR references.\n" +
            'Finish by proposing a conventional commit message with a mandatory scope, e.g. "feat(<scope>): <summary>".',
        ),
      };
    }

    case "pix-write-tests": {
      return {
        name,
        description: "Write tests (TDD + a11y + devops)",
        messages: user(
          "You are a test-writing specialist for pix-galaxy-mcp.\n" +
            "Sequence:\n" +
            "1. Route through `pix_tool` (with framework when known) and load the test-driven-development skill evidence (pix_test_driven_development).\n" +
            "2. Depending on the test types named in the request (tdd, a11y, devops, all): write failing unit tests first (TDD), generate Playwright + @axe-core/playwright a11y specs (pix_styleguide_a11y / pix_devops_testing), or both.\n" +
            "3. For component tests use `pix_tool_component` (component=a11y-test-basic/forms/components, playwright-config).\n" +
            "4. Run the tests and report real outcomes; never claim unexecuted checks passed.\n" +
            "5. Validate the test code with `pix_tool_check`.\n" +
            "If the scope is ambiguous, ask the user what to cover before finishing.\n" +
            'Finish by proposing a conventional commit message with a mandatory scope, e.g. "test(<scope>): add ... tests".',
        ),
      };
    }

    case "pix-handoff": {
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
          "You are a handoff specialist for pix-galaxy-mcp.\n" +
            "The user invoked `/pix-handoff`; every option is optional and defaults are applied server-side. The requested options are already resolved here into exact tool arguments - do not reinterpret them.\n" +
            "Resolved arguments for `pix_tool_process_handoff` (mode: handoff | close-session):\n" +
            `- mode=${options.mode}\n` +
            `- compress=${options.compress ? "true" : "false"}\n` +
            `- format=${options.format}\n` +
            `- ${includeFlags}\n` +
            `- maxTokens=${options.maxTokens}\n` +
            "Run `pix_tool_process_handoff` with EXACTLY these arguments; do not change them.\n" +
            "Include the ADR summary (docs/adr) and git context in the output.\n" +
            "Present the handoff as a paste-ready block for a new session; include the commit-scope convention reminder.\n" +
            "If the resolved arguments are ambiguous, ask the user which parts to include.\n" +
            "Finish by proposing the next conventional commit message with a mandatory scope for the pending changes.",
        ),
      };
    }

    default: {
      break;
    }
  }

  // ── Area prompts ───────────────────────────────────────────────
  const AREAS = {
    "pix-meta": areaPromptText(
      "meta",
      "pix_tool, pix_tool_gateway, pix_tool_apply, pix_tool_search, pix_tool_check, pix_tool_scaffold, pix_tool_detect, pix_tool_fix, pix_tool_process_adr, pix_tool_process_handoff",
    ),
    "pix-frontend": areaPromptText(
      "frontend",
      "pix_frontend_react, pix_frontend_vue, pix_frontend_svelte, pix_frontend_angular, pix_frontend_solidjs, pix_frontend_astro, pix_frontend_meta_next, pix_frontend_meta_nuxt, pix_frontend_meta_remix, pix_frontend_vanilla_reactive, pix_frontend_design",
    ),
    "pix-backend": areaPromptText(
      "backend",
      "pix_backend_node, pix_backend_express, pix_backend_fastify, pix_backend_hono, pix_backend_nestjs, pix_backend_graphql, pix_backend_api_design, pix_backend_security",
    ),
    "pix-data": areaPromptText(
      "data",
      "pix_data_postgresql, pix_data_mysql, pix_data_sqlite, pix_data_mongodb, pix_data_duckdb, pix_data_indexed_db, pix_data_sql",
    ),
    "pix-toolchain": areaPromptText(
      "toolchain",
      "pix_toolchain_vite, pix_toolchain_pnpm, pix_toolchain_turborepo, pix_toolchain_rspack, pix_toolchain_parcel, pix_toolchain_typescript, pix_toolchain_eslint, pix_toolchain_biome, pix_toolchain_husky, pix_toolchain_commits, pix_toolchain_project",
    ),
    "pix-styleguide": areaPromptText(
      "styleguide",
      "pix_styleguide_a11y, pix_styleguide_css, pix_styleguide_html, pix_styleguide_javascript, pix_styleguide_json, pix_styleguide_markdown, pix_styleguide_naming, pix_styleguide_patterns, pix_styleguide_validation",
    ),
    "pix-process": areaPromptText(
      "process",
      "pix_process_code_review, pix_process_feature_workflow, pix_process_documentation, pix_process_bmad, pix_tool_process_adr, pix_tool_process_handoff",
    ),
    "pix-devops": areaPromptText(
      "devops",
      "pix_devops_docker, pix_devops_gitlab_ci, pix_devops_observability, pix_devops_testing, pix_devops_version",
    ),
    "pix-platform": areaPromptText(
      "platform",
      "pix_platform_web, pix_platform_desktop, pix_platform_expo, pix_platform_agent, pix_platform_library",
    ),
    "pix-caveman": areaPromptText(
      "caveman",
      "pix_caveman, pix_caveman_commit, pix_caveman_review, pix_caveman_compress, pix_caveman_help",
    ),
    "pix-ai": areaPromptText("ai", "pix_ai_agents"),
    "pix-skills": areaPromptText("skills", "pix_find_skills"),
    "pix-tdd": areaPromptText("tdd", "pix_test_driven_development"),
    "pix-ui": areaPromptText("ui", "pix_ui_design_system"),
  };
  if (AREAS[name]) {
    return { name, description: name, messages: user(AREAS[name]) };
  }

  // ── Legacy prompts (updated to the shared rules) ───────────────
  switch (name) {
    case "pix-code-review": {
      return {
        name,
        description: "Review code against pix styleguides",
        messages: user(
          "You are a code reviewer that enforces pix styleguide rules:\n" +
            "- Zero CSS classes (use element + [data-part] selectors only)\n" +
            "- Zero inline styles\n" +
            "- Semantic HTML mandatory (no <div> where semantic element exists)\n" +
            "- Barrel file tree (index.js re-exports, _PascalCase.ext files)\n" +
            "Run `pix_tool_check` against the code and the routed styleguide skill; iterate until all guardrails pass.\n" +
            "Verify TDD/a11y baselines apply to the reviewed change; if tests are missing, flag it and ask the user.\n" +
            "Finish by proposing a conventional commit message with a mandatory scope.",
        ),
      };
    }

    case "pix-a11y-audit": {
      return {
        name,
        description: "Audit a11y end-to-end (review + tests)",
        messages: user(
          "You are an a11y auditor enforcing WCAG 2.2 AA.\n" +
            "Part 1 - Review the code:\n" +
            "  - semantic HTML, headings hierarchy, color contrast (4.5:1 text, 3:1 large),\n" +
            "  - focus styles, keyboard nav, form labels, alt text, ARIA usage.\n" +
            "Part 2 - Ensure automated tests exist in tests/a11y/ using Playwright + @axe-core/playwright:\n" +
            "  - tests/a11y/_basic.spec.js (page structure)\n" +
            "  - tests/a11y/_forms.spec.js (form a11y)\n" +
            "  - tests/a11y/_components.spec.js (component a11y)\n" +
            "  - playwright.config.js\n" +
            "Use AxeBuilder from @axe-core/playwright, assert expect(results.violations).toEqual([]).\n" +
            "If the a11y tests are missing, generate them - use `pix_tool_component` for test templates.\n" +
            "Validate findings and generated tests with `pix_tool_check` against pix_styleguide_a11y.\n" +
            "Run the tests and report real outcomes; never claim unexecuted checks passed.\n" +
            'Finish by proposing a conventional commit message with a mandatory scope, e.g. "test(a11y): ...".',
        ),
      };
    }

    default: {
      return null;
    }
  }
}
