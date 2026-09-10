// SPDX-FileCopyrightText: 2025-2026 pixu1980
// SPDX-License-Identifier: MIT
/**
 * @module prompts/defs
 *
 * The static prompt definitions and their help examples. Data file: exempt
 * from the size cap. Persona prompts are generated, not listed here.
 */

/** The static prompt definitions (name, description, argument schemas). */
export const PROMPT_DEFS = [
  {
    name: "pix-area-ai",
    description: "AI agent work: pix-ai and agent-architecture patterns for agent integrations",
    arguments: [{ name: "request", description: "Agent integration task", required: true }],
  },

  {
    name: "pix-area-backend",
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
    name: "pix-area-data",
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
    name: "pix-area-devops",
    description: "DevOps work: docker, observability, testing",
    arguments: [{ name: "request", description: "Container, observability, or testing task", required: true }],
  },
  {
    name: "pix-area-frontend",
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
      "Produce a compressed context handoff (ADR summary + git context) to resume in a new session, commiting pending work as scoped Conventional Commits first. Usage: /pix-handoff [options] or /pix-handoff help - no arguments = quick handoff",
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
    name: "pix-area-toolset",
    description: "Work with the pix dispatcher/action toolset: routing, gateway, apply, search, check, scaffold, detect, fix, ADR, handoff",
    arguments: [{ name: "request", description: "What to route, search, validate, scaffold, or record", required: true }],
  },
  {
    name: "pix-area-platform",
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
    name: "pix-area-process",
    description: "Process work: code review, TDD, feature workflow, documentation, ADR, handoff, BMAD",
    arguments: [{ name: "request", description: "Review, TDD, workflow, documentation, or decision task", required: true }],
  },
  {
    name: "pix-area-skills",
    description: "Skill discovery: find, install, and evaluate agent skills",
    arguments: [{ name: "request", description: "Skill you are looking for", required: true }],
  },
  {
    name: "pix-area-styleguide",
    description: "Styleguide work: a11y, css, html, javascript, json, markdown, naming, patterns, validation",
    arguments: [{ name: "request", description: "Styleguide check or authoring task", required: true }],
  },
  {
    name: "pix-area-toolchain",
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
    name: "pix-area-ui",
    description: "UI design-system work: design-system components, tokens, patterns",
    arguments: [{ name: "request", description: "UI/design-system task", required: true }],
  },
  {
    name: "pix-adr",
    description: "Record an architecture decision: context, decision, alternatives, consequences",
    arguments: [{ name: "decision", description: "The decision to record (free text: what changed and why)", required: true }],
  },
  {
    name: "pix-process-check",
    description: "Validate code against the pix guardrails and fix what fails",
    arguments: [
      {
        name: "target",
        description: "What to check (free text: paths, or the current diff). Default: the current diff.",
        required: false,
      },
    ],
  },
  {
    name: "pix-flight",
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
    name: "pix-handon",
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
    name: "pix-init",
    description: "Prepare a project for pix-galaxy-mcp: the central recorder directory and tokensave",
    arguments: [{ name: "options", description: "Space-separated: no-tokensave. Default: the full init.", required: false }],
  },
  {
    name: "pix-update",
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
 * Examples shown by the generic `/pix-* help` message, keyed by prompt name.
 */
export const PROMPT_EXAMPLES = {
  "pix-area-ai": ["/pix-area-ai help", "/pix-area-ai add a web-search tool to the agent"],
  "pix-area-backend": ["/pix-area-backend help", "/pix-area-backend express REST API with zod validation"],
  "pix-area-data": ["/pix-area-data help", "/pix-area-data postgresql schema for the users table"],
  "pix-area-devops": ["/pix-area-devops help", "/pix-area-devops multi-stage docker build for node"],
  "pix-area-frontend": ["/pix-area-frontend help", "/pix-area-frontend react login form with validation"],
  "pix-area-toolset": ["/pix-area-toolset help", "/pix-area-toolset search for the a11y skill"],
  "pix-area-platform": ["/pix-area-platform help", "/pix-area-platform electron desktop app scaffold"],
  "pix-area-process": ["/pix-area-process help", "/pix-area-process run a code review on the pending changes"],
  "pix-area-skills": ["/pix-area-skills help", "/pix-area-skills find a skill for docker"],
  "pix-area-styleguide": ["/pix-area-styleguide help", "/pix-area-styleguide check this HTML for semantics"],
  "pix-area-toolchain": ["/pix-area-toolchain help", "/pix-area-toolchain set up vite + biome"],
  "pix-area-ui": ["/pix-area-ui help", "/pix-area-ui design-system button component"],
  "pix-handoff": ["/pix-handoff help", "/pix-handoff close-session"],
  "pix-process-check": ["/pix-process-check help", "/pix-process-check the current diff"],
};
