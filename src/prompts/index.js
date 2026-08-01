/**
 * @module prompts/index
 *
 * MCP Prompt registry for rule-mcp.
 * Provides reusable prompt templates that guide agents through rule AI
 * workflow phases: 5 one-shot workflow prompts (orchestrate multiple tools),
 * 16 area prompts (one per tool area), and 3 legacy prompts.
 *
 * Every prompt:
 *   - routes through the pix_tool dispatcher to the right rule-* skill
 *   - involves TDD/a11y baselines (or asks the user what to cover)
 *   - closes by proposing a conventional commit message with mandatory scope
 *
 * @see https://spec.modelcontextprotocol.io/specification/2025-04-01/#prompts
 */

const FRAMEWORKS = "react, vue, svelte, angular, solid, astro, vanilla";

/**
 * Shared system text for the 16 area prompts.
 *
 * @param {string} area — area name (e.g. "frontend")
 * @param {string} tools — comma-separated rule_tool_* tools of the area
 * @param {string} [frameworkHint] — when set, the framework argument picks the skill
 */
function areaPromptText(area, tools, frameworkHint) {
  const lines = [
    `You are the ${area} area specialist for rule-mcp.`,
    `Route this request through \`pix_tool\` first to pick the exact rule-* skill, then load the returned skill evidence as source of truth: ${tools}.`,
  ];
  if (frameworkHint) {
    lines.push(`Use the framework argument to select the right ${frameworkHint} skill; never invent APIs or dependencies not present in the skill evidence.`);
  } else {
    lines.push("Never invent APIs, files, dependencies, commands, or requirements not present in the skill evidence.");
  }
  lines.push(
    "Baseline: involve TDD (write failing tests first) and a11y (WCAG 2.2 AA, axe-core where applicable). If the request has no test/a11y surface, ask the user what to cover before finishing.",
    "Validate generated code with `rule_tool_check` and iterate until all guardrails pass.",
    `When the work is done, propose a conventional commit message with a mandatory scope, e.g. "feat(${area}): ...".`,
  );
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
      name: "rule-a11y-audit",
      description: "Audit a11y end-to-end: review code for WCAG 2.2 AA compliance and generate Playwright + axe-core tests",
      arguments: [
        { name: "code", description: "Code to review for a11y compliance", required: true },
        { name: "framework", description: "Target framework", required: false },
        { name: "component", description: "Component type to generate tests for", required: false },
      ],
    },
    {
      name: "rule-ai",
      description: "AI agent work: rule-ai-agents patterns for agent integrations",
      arguments: [
        { name: "request", description: "Agent integration task", required: true },
      ],
    },
    {
      name: "rule-architect",
      description: "Project architecture: context packs, interview flows (CLI + web), scaffolding",
      arguments: [
        { name: "request", description: "Architecture, scaffold, or context-pack task", required: true },
      ],
    },
    {
      name: "rule-architect-scaffold",
      description: "Scaffold a new project with .agents/ + .context/ infrastructure",
      arguments: [
        { name: "projectName", description: "Name of the project", required: true },
        { name: "framework", description: `Target framework (${FRAMEWORKS})`, required: false },
        { name: "tier", description: "Context generation tier (starter, standard, deep)", required: false },
      ],
    },
    {
      name: "rule-backend",
      description: "Backend/API work: node, express, fastify, hono, nestjs, graphql, api design, security",
      arguments: [
        { name: "request", description: "Endpoint, service, or backend task", required: true },
        { name: "framework", description: "Backend framework (node, express, fastify, hono, nestjs, graphql)", required: false },
      ],
    },
    {
      name: "rule-caveman",
      description: "Ultra-compressed communication and review: caveman modes, compressed commits, compressed reviews",
      arguments: [
        { name: "request", description: "Text to compress, or commit/review to write in caveman style", required: true },
      ],
    },
    {
      name: "rule-code-review",
      description: "Review code against rule styleguides for the given framework",
      arguments: [
        { name: "framework", description: `Framework (${FRAMEWORKS})`, required: false },
        { name: "code", description: "Code to review", required: true },
      ],
    },
    {
      name: "rule-data",
      description: "Data-layer work: postgresql, mysql, sqlite, mongodb, duckdb, indexed-db, SQL",
      arguments: [
        { name: "request", description: "Schema, query, or data-layer task", required: true },
        { name: "database", description: "Database (postgresql, mysql, sqlite, mongodb, duckdb, indexed_db, sql)", required: false },
      ],
    },
    {
      name: "rule-devops",
      description: "DevOps work: docker, gitlab-ci, observability, testing, versioning",
      arguments: [
        { name: "request", description: "CI/CD, container, observability, or versioning task", required: true },
      ],
    },
    {
      name: "rule-frontend",
      description: "Frontend work following rule styleguides: zero CSS classes, semantic HTML, external CSS, TDD + a11y",
      arguments: [
        { name: "request", description: "Component, page, or frontend task", required: true },
        { name: "framework", description: `Target framework (${FRAMEWORKS})`, required: false },
      ],
    },
    {
      name: "rule-grill",
      description: "Structured questioning: grill-me interviews and grill-with-docs evidence drills",
      arguments: [
        { name: "request", description: "Topic to be grilled on", required: true },
      ],
    },
    {
      name: "rule-handoff",
      description: "Produce a compressed context handoff (ADR summary + git context) to resume in a new session",
      arguments: [
        { name: "mode", description: "Handoff mode (handoff, close-session)", required: true },
        { name: "includeGitDiff", description: "Include working-tree diff (default: yes)", required: false },
        { name: "compress", description: "Aggressively compress the output (default: no)", required: false },
      ],
    },
    {
      name: "rule-meta",
      description: "Work with the rule dispatcher/action toolset: routing, gateway, apply, search, check, scaffold, detect, fix, ADR, handoff",
      arguments: [
        { name: "request", description: "What to route, search, validate, scaffold, or record", required: true },
      ],
    },
    {
      name: "rule-new-feature",
      description: "Implement a feature end-to-end: route → evidence → failing tests → code → guardrails → tests → commit scope",
      arguments: [
        { name: "feature", description: "Feature description or requirement", required: true },
        { name: "framework", description: `Target framework (${FRAMEWORKS})`, required: false },
        { name: "area", description: "Area (frontend, backend, data, toolchain, …)", required: false },
        { name: "includeTests", description: "Whether to generate TDD + a11y tests (default: yes)", required: false },
      ],
    },
    {
      name: "rule-platform",
      description: "Platform work: web, desktop, expo, agent, library",
      arguments: [
        { name: "request", description: "Platform target or task", required: true },
        { name: "platform", description: "Platform (web, desktop, expo, agent, library)", required: false },
      ],
    },
    {
      name: "rule-process",
      description: "Process work: code review, feature workflow, documentation, ADR, handoff, BMAD",
      arguments: [
        { name: "request", description: "Review, workflow, documentation, or decision task", required: true },
      ],
    },
    {
      name: "rule-pull-request",
      description: "Prepare a pull request: review + a11y + security, update the ADR, commit with scope, PR description",
      arguments: [
        { name: "description", description: "What changed / PR summary", required: true },
        { name: "framework", description: `Target framework (${FRAMEWORKS})`, required: false },
        { name: "updateAdr", description: "Generate or update the Architecture Decision Record (default: yes)", required: false },
      ],
    },
    {
      name: "rule-setup-project",
      description: "Bootstrap a project end-to-end: detect framework, scaffold config, toolchain, and architect context",
      arguments: [
        { name: "projectName", description: "Name of the project", required: true },
        { name: "framework", description: `Target framework (${FRAMEWORKS})`, required: false },
        { name: "toolchain", description: "Build toolchain (vite, parcel, rspack, turborepo…)", required: false },
        { name: "tier", description: "Architect context tier (starter, standard, deep)", required: false },
      ],
    },
    {
      name: "rule-skills",
      description: "Skill discovery: find, install, and evaluate agent skills",
      arguments: [
        { name: "request", description: "Skill you are looking for", required: true },
      ],
    },
    {
      name: "rule-styleguide",
      description: "Styleguide work: a11y, css, html, javascript, json, markdown, naming, patterns, validation",
      arguments: [
        { name: "request", description: "Styleguide check or authoring task", required: true },
      ],
    },
    {
      name: "rule-tdd",
      description: "Test-driven development workflow: red → green → refactor, failing tests first",
      arguments: [
        { name: "request", description: "Feature or bugfix to develop test-first", required: true },
      ],
    },
    {
      name: "rule-toolchain",
      description: "Toolchain configuration: vite, pnpm, turborepo, rspack, parcel, typescript, eslint, biome, husky, commits, project",
      arguments: [
        { name: "request", description: "Toolchain config or setup task", required: true },
        { name: "tool", description: "Tool (vite, pnpm, turborepo, rspack, parcel, typescript, eslint, biome, husky, commits)", required: false },
      ],
    },
    {
      name: "rule-ui",
      description: "UI design-system work: design-system components, tokens, patterns",
      arguments: [
        { name: "request", description: "UI/design-system task", required: true },
      ],
    },
    {
      name: "rule-write-tests",
      description: "Write tests: TDD unit tests, a11y Playwright + axe-core specs, and devops test setup",
      arguments: [
        { name: "scope", description: "What to test (feature, component, module, project)", required: true },
        { name: "framework", description: `Target framework (${FRAMEWORKS})`, required: false },
        { name: "testType", description: "Test type (tdd, a11y, devops, all — default all)", required: false },
      ],
    },
  ];
}

/**
 * Get a specific prompt by name with its system message content.
 *
 * @param {string} name — Prompt name
 * @returns {{ name: string, description: string, messages: Array<{ role: string, content: { type: string, text: string } }> }|null}
 */
export function getPrompt(name) {
  const user = (text) => [{ role: "user", content: { type: "text", text } }];

  // ── One-shot workflow prompts ──────────────────────────────────
  switch (name) {
    case "rule-setup-project":
      return {
        name,
        description: "Bootstrap a project end-to-end",
        messages: user(
          "You are a project bootstrap specialist for rule-mcp.\n" +
          "Sequence:\n" +
          "1. Call `rule_tool_detect` on the project path (or use the framework argument) to detect the stack.\n" +
          "2. Route through `pix_tool` with the detected framework to load the primary rule-* skill evidence.\n" +
          "3. Call `rule_tool_scaffold` for the project config files, then `pix_toolchain_project` (or the area toolchain skill) for tooling setup.\n" +
          "4. Generate architect context (`.agents/` + `.context/`) via the architect skill (`pix_architect_cli` or `pix_architect_web`, mode=interview/scaffold) at the requested tier.\n" +
          "5. Validate every generated file with `rule_tool_check` and iterate until all guardrails pass.\n" +
          "Baseline: if the scaffold produces code, include failing tests first (TDD) and a11y checks; if not applicable, ask the user what to cover.\n" +
          "Finish by proposing a conventional commit message with a mandatory scope, e.g. \"chore(setup): ...\"."
        ),
      };

    case "rule-new-feature":
      return {
        name,
        description: "Implement a feature end-to-end",
        messages: user(
          "You are a feature-implementation specialist for rule-mcp.\n" +
          "Sequence:\n" +
          "1. Route the feature through `pix_tool` (with framework/area when known) and load the routed skill evidence as source of truth.\n" +
          "2. If a feature-workflow skill applies (pix_process_feature_workflow or BMAD), run it first to define scope.\n" +
          "3. Write failing tests first (TDD) for the feature; include a11y tests (Playwright + axe-core) when the change has UI surface.\n" +
          "4. Implement against the skill evidence; call `rule_tool_component` for component templates when applicable.\n" +
          "5. Run `rule_tool_check` against the generated code and iterate until all guardrails pass.\n" +
          "6. Run the project tests/typecheck and report real outcomes.\n" +
          "If the request is ambiguous, ask the user what to cover before finishing.\n" +
          "Finish by proposing a conventional commit message with a mandatory scope, e.g. \"feat(<area>): <summary>\"."
        ),
      };

    case "rule-pull-request":
      return {
        name,
        description: "Prepare a pull request (review + ADR + commit scope + description)",
        messages: user(
          "You are a pull-request specialist for rule-mcp.\n" +
          "Sequence:\n" +
          "1. Review the changes: run the code-review skill (`pix_process_code_review`), caveman review (`pix_caveman_review`), a11y review (`pix_styleguide_a11y`), and backend security review (`pix_backend_security`) when the change touches those surfaces.\n" +
          "2. Fix every guardrail failure with `rule_tool_check` until all pass.\n" +
          "3. Generate or update the Architecture Decision Record with `rule_tool_process_adr` for any structural decision (updateAdr defaults to yes).\n" +
          "4. Ensure the work includes tests (TDD + a11y where applicable); if missing, flag it and ask the user.\n" +
          "5. Write the PR description: summary, why, test evidence, and any ADR references.\n" +
          "Finish by proposing a conventional commit message with a mandatory scope, e.g. \"feat(<scope>): <summary>\"."
        ),
      };

    case "rule-write-tests":
      return {
        name,
        description: "Write tests (TDD + a11y + devops)",
        messages: user(
          "You are a test-writing specialist for rule-mcp.\n" +
          "Sequence:\n" +
          "1. Route through `pix_tool` (with framework when known) and load the test-driven-development skill evidence (pix_test_driven_development).\n" +
          "2. Depending on testType: write failing unit tests first (TDD), generate Playwright + @axe-core/playwright a11y specs (pix_styleguide_a11y / pix_devops_testing), or both.\n" +
          "3. For component tests use `rule_tool_component` (component=a11y-test-basic/forms/components, playwright-config).\n" +
          "4. Run the tests and report real outcomes; never claim unexecuted checks passed.\n" +
          "5. Validate the test code with `rule_tool_check`.\n" +
          "If the scope is ambiguous, ask the user what to cover before finishing.\n" +
          "Finish by proposing a conventional commit message with a mandatory scope, e.g. \"test(<scope>): add ... tests\"."
        ),
      };

    case "rule-handoff":
      return {
        name,
        description: "Produce a compressed context handoff",
        messages: user(
          "You are a handoff specialist for rule-mcp.\n" +
          "Sequence:\n" +
          "1. Run `rule_tool_process_handoff` with the requested mode (handoff or close-session) and options.\n" +
          "2. Include the ADR summary (docs/adr) and git context (includeGitDiff defaults to yes).\n" +
          "3. If compress is set, produce the aggressive compressed form.\n" +
          "4. Present the handoff as a paste-ready block for a new session; include the commit-scope convention reminder.\n" +
          "If anything is ambiguous, ask the user which parts to include.\n" +
          "Finish by proposing the next conventional commit message with a mandatory scope for the pending changes."
        ),
      };

    default:
      break;
  }

  // ── Area prompts ───────────────────────────────────────────────
  const AREAS = {
    "rule-meta": areaPromptText("meta", "pix_tool, rule_tool_gateway, rule_tool_apply, rule_tool_search, rule_tool_check, rule_tool_scaffold, rule_tool_detect, rule_tool_fix, rule_tool_process_adr, rule_tool_process_handoff"),
    "rule-frontend": areaPromptText("frontend", "pix_frontend_react, pix_frontend_vue, pix_frontend_svelte, pix_frontend_angular, pix_frontend_solidjs, pix_frontend_astro, pix_frontend_meta_next, pix_frontend_meta_nuxt, pix_frontend_meta_remix, pix_frontend_vanilla_reactive, pix_frontend_design", "frontend"),
    "rule-backend": areaPromptText("backend", "pix_backend_node, pix_backend_express, pix_backend_fastify, pix_backend_hono, pix_backend_nestjs, pix_backend_graphql, pix_backend_api_design, pix_backend_security", "backend"),
    "rule-data": areaPromptText("data", "pix_data_postgresql, pix_data_mysql, pix_data_sqlite, pix_data_mongodb, pix_data_duckdb, pix_data_indexed_db, pix_data_sql", "data"),
    "rule-toolchain": areaPromptText("toolchain", "pix_toolchain_vite, pix_toolchain_pnpm, pix_toolchain_turborepo, pix_toolchain_rspack, pix_toolchain_parcel, pix_toolchain_typescript, pix_toolchain_eslint, pix_toolchain_biome, pix_toolchain_husky, pix_toolchain_commits, pix_toolchain_project", "toolchain"),
    "rule-styleguide": areaPromptText("styleguide", "pix_styleguide_a11y, pix_styleguide_css, pix_styleguide_html, pix_styleguide_javascript, pix_styleguide_json, pix_styleguide_markdown, pix_styleguide_naming, pix_styleguide_patterns, pix_styleguide_validation"),
    "rule-process": areaPromptText("process", "pix_process_code_review, pix_process_feature_workflow, pix_process_documentation, pix_process_bmad, rule_tool_process_adr, rule_tool_process_handoff"),
    "rule-devops": areaPromptText("devops", "pix_devops_docker, pix_devops_gitlab_ci, pix_devops_observability, pix_devops_testing, pix_devops_version"),
    "rule-platform": areaPromptText("platform", "pix_platform_web, pix_platform_desktop, pix_platform_expo, pix_platform_agent, pix_platform_library", "platform"),
    "rule-caveman": areaPromptText("caveman", "pix_caveman, pix_caveman_commit, pix_caveman_review, pix_caveman_compress, pix_caveman_help"),
    "rule-architect": areaPromptText("architect", "pix_architect_cli, pix_architect_web"),
    "rule-grill": areaPromptText("grill", "pix_grill_me, pix_grill_with_docs"),
    "rule-ai": areaPromptText("ai", "pix_ai_agents"),
    "rule-skills": areaPromptText("skills", "pix_find_skills"),
    "rule-tdd": areaPromptText("tdd", "pix_test_driven_development"),
    "rule-ui": areaPromptText("ui", "pix_ui_design_system"),
  };
  if (AREAS[name]) {
    return { name, description: name, messages: user(AREAS[name]) };
  }

  // ── Legacy prompts (updated to the shared rules) ───────────────
  switch (name) {
    case "rule-code-review":
      return {
        name,
        description: "Review code against rule styleguides",
        messages: user(
          "You are a code reviewer that enforces rule styleguide rules:\n" +
          "- Zero CSS classes (use element + [data-part] selectors only)\n" +
          "- Zero inline styles\n" +
          "- Semantic HTML mandatory (no <div> where semantic element exists)\n" +
          "- Barrel file tree (index.js re-exports, _PascalCase.ext files)\n" +
          "Run `rule_tool_check` against the code and the routed styleguide skill; iterate until all guardrails pass.\n" +
          "Verify TDD/a11y baselines apply to the reviewed change; if tests are missing, flag it and ask the user.\n" +
          "Finish by proposing a conventional commit message with a mandatory scope."
        ),
      };

    case "rule-a11y-audit":
      return {
        name,
        description: "Audit a11y end-to-end (review + tests)",
        messages: user(
          "You are an a11y auditor enforcing WCAG 2.2 AA.\n" +
          "Part 1 — Review the code:\n" +
          "  - semantic HTML, headings hierarchy, color contrast (4.5:1 text, 3:1 large),\n" +
          "  - focus styles, keyboard nav, form labels, alt text, ARIA usage.\n" +
          "Part 2 — Ensure automated tests exist in tests/a11y/ using Playwright + @axe-core/playwright:\n" +
          "  - tests/a11y/_basic.spec.js (page structure)\n" +
          "  - tests/a11y/_forms.spec.js (form a11y)\n" +
          "  - tests/a11y/_components.spec.js (component a11y)\n" +
          "  - playwright.config.js\n" +
          "Use AxeBuilder from @axe-core/playwright, assert expect(results.violations).toEqual([]).\n" +
          "If the a11y tests are missing, generate them — use `rule_tool_component` for test templates.\n" +
          "Validate findings and generated tests with `rule_tool_check` against pix_styleguide_a11y.\n" +
          "Run the tests and report real outcomes; never claim unexecuted checks passed.\n" +
          "Finish by proposing a conventional commit message with a mandatory scope, e.g. \"test(a11y): ...\"."
        ),
      };

    case "rule-architect-scaffold":
      return {
        name,
        description: "Scaffold a new project with .agents/ + .context/ infrastructure",
        messages: user(
          "You are a project scaffold generator following rule-architect principles.\n" +
          "Create:\n" +
          "1. .agents/ directory with instructions/, prompts/, skills/, styleguides/\n" +
          "2. AGENTS.md with golden rules, where to look, workflow\n" +
          "3. AI_WORKFLOW.md with Spec → Plan → Implement → Test → Docs → PR phases\n" +
          "4. cli/ with .context/ templates and cli.js generator\n" +
          "5. .context/ directory structure (can be generated via pix_architect mode=interview)\n" +
          "Call pix_architect mode=scaffold for file templates; validate with `rule_tool_check`.\n" +
          "Baseline: if generated files include code, cover it with failing tests first (TDD); otherwise ask the user what to cover.\n" +
          "Finish by proposing a conventional commit message with a mandatory scope, e.g. \"chore(scaffold): ...\"."
        ),
      };

    default:
      return null;
  }
}
