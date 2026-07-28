/**
 * @module prompts/index
 *
 * MCP Prompt registry for rule-mcp.
 * Provides reusable prompt templates that guide agents
 * through rule AI workflow phases.
 *
 * @see https://spec.modelcontextprotocol.io/specification/2025-04-01/#prompts
 */

/**
 * List all available prompts with their descriptions and argument schemas.
 *
 * @returns {Array<{ name: string, description: string, arguments: Array<{ name: string, description: string, required?: boolean }> }>}
 */
export function listPrompts() {
  return [
    {
      name: "rule-code-review",
      description: "Review code against rule styleguides for the given framework",
      arguments: [
        { name: "framework", description: "Framework (react, vue, svelte, angular, solid, astro, vanilla)", required: false },
        { name: "code", description: "Code to review", required: true },
      ],
    },
    {
      name: "rule-generate-component",
      description: "Generate a component following rule AI principles",
      arguments: [
        { name: "framework", description: "Target framework", required: true },
        { name: "component", description: "Component type (button, card, modal, formField, list, nav)", required: true },
        { name: "features", description: "Additional features or requirements", required: false },
      ],
    },
    {
      name: "rule-a11y-test",
      description: "Generate Playwright + axe-core a11y tests for a project",
      arguments: [
        { name: "framework", description: "Target framework", required: true },
        { name: "component", description: "Component type to test", required: false },
      ],
    },
    {
      name: "rule-a11y-review",
      description: "Review code for a11y compliance (WCAG 2.2 AA, Playwright + axe-core required)",
      arguments: [
        { name: "code", description: "Code to review", required: true },
        { name: "framework", description: "Framework", required: false },
      ],
    },
    {
      name: "rule-architect-scaffold",
      description: "Scaffold a new project with .agents/ + .context/ infrastructure",
      arguments: [
        { name: "projectName", description: "Name of the project", required: true },
        { name: "framework", description: "Target framework (react, vue, svelte, etc.)", required: false },
        { name: "tier", description: "Context generation tier (starter, standard, deep)", required: false },
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
  switch (name) {
    case "rule-code-review":
      return {
        name,
        description: "Review code against rule styleguides",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                "You are a code reviewer that enforces rule styleguide rules:\n" +
                "- Zero CSS classes (use element + [data-part] selectors only)\n" +
                "- Zero inline styles\n" +
                "- Semantic HTML mandatory (no <div> where semantic element exists)\n" +
                "- Barrel file tree (index.js re-exports, _PascalCase.ext files)",
            },
          },
        ],
      };

    case "rule-generate-component":
      return {
        name,
        description: "Generate a component following rule AI principles",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                "You are a component generator that outputs framework-specific code following rule AI principles:\n" +
                "- Zero CSS classes (use element + [data-part] selectors only)\n" +
                "- Zero inline styles\n" +
                "- Semantic HTML\n" +
                "- External CSS via adoptedStyleSheets or framework-native imports\n" +
                "- Call pix_component first to get the template, then adapt it",
            },
          },
        ],
      };

    case "rule-a11y-test":
      return {
        name,
        description: "Generate Playwright + axe-core a11y tests",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                "You are an a11y test generator. Generate Playwright test files using @axe-core/playwright.\n" +
                "Every project must have:\n" +
                "  - tests/a11y/_basic.spec.js (page structure)\n" +
                "  - tests/a11y/_forms.spec.js (form a11y)\n" +
                "  - tests/a11y/_components.spec.js (component a11y)\n" +
                "  - playwright.config.js\n" +
                "Use AxeBuilder from @axe-core/playwright, assert expect(results.violations).toEqual([]).\n" +
                "Follow rule styleguides: zero CSS classes, semantic HTML, external CSS.",
            },
          },
        ],
      };

    case "rule-a11y-review":
      return {
        name,
        description: "Review code for WCAG 2.2 AA compliance with Playwright + axe-core tests",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                "You are an a11y reviewer enforcing WCAG 2.2 AA.\n" +
                "Check: semantic HTML, headings hierarchy, color contrast (4.5:1 text, 3:1 large),\n" +
                "focus styles, keyboard nav, form labels, alt text, ARIA usage.\n" +
                "Also verify that automated a11y tests exist in tests/a11y/ using Playwright + @axe-core/playwright.\n" +
                "If tests are missing, flag a violation.",
            },
          },
        ],
      };

    case "rule-architect-scaffold":
      return {
        name,
        description: "Scaffold a new project with .agents/ + .context/ infrastructure",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                "You are a project scaffold generator following rule-architect principles.\n" +
                "Create:\n" +
                "1. .agents/ directory with instructions/, prompts/, skills/, styleguides/\n" +
                "2. AGENTS.md with golden rules, where to look, workflow\n" +
                "3. AI_WORKFLOW.md with Spec → Plan → Implement → Test → Docs → PR phases\n" +
                "4. cli/ with .context/ templates and cli.js generator\n" +
                "5. .context/ directory structure (can be generated via pix_architect mode=interview)\n" +
                "Call pix_architect mode=scaffold for file templates.",
            },
          },
        ],
      };

    default:
      return null;
  }
}
