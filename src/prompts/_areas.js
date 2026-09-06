/** The 15 area prompts: one specialist system text per tool area. */

/**
 * Shared system text for the 15 area prompts.
 *
 * @param {string} area - area name (e.g. "frontend")
 * @param {string} tools - comma-separated rule_tool_* tools of the area
 */
export function areaPromptText(area, tools) {
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

/** System text per area prompt name. */
export const AREAS = {
  "rule-area-meta": areaPromptText(
    "meta",
    "pix_tool, rule_tool_gateway, rule_tool_apply, rule_tool_search, rule_tool_check, rule_tool_scaffold, rule_tool_detect, rule_tool_fix, rule_tool_process_adr, rule_tool_process_handoff",
  ),
  "rule-area-frontend": areaPromptText(
    "frontend",
    "pix_frontend_react, pix_frontend_vue, pix_frontend_svelte, pix_frontend_angular, pix_frontend_solidjs, pix_frontend_meta_astro, pix_frontend_meta_next, pix_frontend_meta_nuxt, pix_frontend_meta_remix, pix_frontend_vanilla_reactive, pix_frontend_design",
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
