

/**
 * @module prompts/defs
 *
 * The static prompt definitions and their help examples. Data file: exempt
 * from the size cap. Persona prompts are generated, not listed here.
 */

/** The static prompt definitions (name, description, argument schemas). */
export const PROMPT_DEFS = [
  {
    name: "rule-area-ai",
    description: "AI agent work: rule-ai and agent-architecture patterns for agent integrations",
    arguments: [{ name: "request", description: "Agent integration task", required: true }],
  },

  {
    name: "rule-area-backend",
    description: "Backend/API work: node, express, fastify, hono, nestjs, graphql, security",
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
    description: "DevOps work: docker, observability, testing",
    arguments: [{ name: "request", description: "Container, observability, or testing task", required: true }],
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
    name: "rule-area-toolset",
    description: "Work with the rule dispatcher/action toolset: routing, gateway, apply, search, check, scaffold, detect, fix, ADR, handoff",
    arguments: [{ name: "request", description: "What to route, search, validate, scaffold, or record", required: true }],
  },
  {
    name: "rule-area-platform",
    description: "Platform work: web, desktop, agent, library",
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
    arguments: [{ name: "request", description: "Review, TDD, workflow, documentation, or decision task", required: true }],
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
    description: "Toolchain configuration: vite, pnpm, turborepo, rspack, parcel, typescript, eslint, biome, husky, commits, project",
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
    arguments: [{ name: "decision", description: "The decision to record (free text: what changed and why)", required: true }],
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
    arguments: [{ name: "options", description: "Space-separated: no-tokensave. Default: the full init.", required: false }],
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
];

/**
 * Examples shown by the generic `/rule-* help` message, keyed by prompt name.
 */
export const PROMPT_EXAMPLES = {
  "rule-area-ai": ["/rule-area-ai help", "/rule-area-ai add a web-search tool to the agent"],
  "rule-area-backend": ["/rule-area-backend help", "/rule-area-backend express REST API with zod validation"],
  "rule-area-data": ["/rule-area-data help", "/rule-area-data postgresql schema for the users table"],
  "rule-area-devops": ["/rule-area-devops help", "/rule-area-devops multi-stage docker build for node"],
  "rule-area-frontend": ["/rule-area-frontend help", "/rule-area-frontend react login form with validation"],
  "rule-area-toolset": ["/rule-area-toolset help", "/rule-area-toolset search for the a11y skill"],
  "rule-area-platform": ["/rule-area-platform help", "/rule-area-platform electron desktop app scaffold"],
  "rule-area-process": ["/rule-area-process help", "/rule-area-process run a code review on the pending changes"],
  "rule-area-skills": ["/rule-area-skills help", "/rule-area-skills find a skill for docker"],
  "rule-area-styleguide": ["/rule-area-styleguide help", "/rule-area-styleguide check this HTML for semantics"],
  "rule-area-toolchain": ["/rule-area-toolchain help", "/rule-area-toolchain set up vite + biome"],
  "rule-area-ui": ["/rule-area-ui help", "/rule-area-ui design-system button component"],
  "rule-handoff": ["/rule-handoff help", "/rule-handoff close-session"],
  "rule-process-check": ["/rule-process-check help", "/rule-process-check the current diff"],
};
