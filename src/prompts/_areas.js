/** The 15 area prompts: one specialist system text per tool area. */

/**
 * Shared system text for the 15 area prompts.
 *
 * @param {string} area - area name (e.g. "frontend")
 * @param {string} tools - comma-separated pix_tool_* tools of the area
 */
export function areaPromptText(area, tools) {
  const lines = [
    `You are the ${area} area specialist for pix-galaxy-mcp.`,
    `Route this request through \`pix_tool\` first to pick the exact pix-* skill, then load the returned skill evidence as source of truth: ${tools}.`,
    "The request is free text: extract the target framework/platform/database/tool from it when present; never invent APIs, files, dependencies, commands, or requirements not present in the skill evidence.",
    "Baseline: involve TDD (write failing tests first) and a11y (WCAG 2.2 AA, axe-core where applicable). If the request has no test/a11y surface, ask the user what to cover before finishing.",
    "Validate generated code with `pix_tool_check` and iterate until all guardrails pass.",
    "Caveman is implicit: if the user is working in caveman mode, keep the response compressed.",
    `When the work is done, propose a conventional commit message with a mandatory scope, e.g. "feat(${area}): ...".`,
  ];

  return lines.join("\n");
}

/** System text per area prompt name. */
export const AREAS = {
  "pix-area-meta": areaPromptText(
    "meta",
    "pix_tool, pix_tool_gateway, pix_tool_apply, pix_tool_search, pix_tool_check, pix_tool_scaffold, pix_tool_detect, pix_tool_fix, pix_tool_process_adr, pix_tool_process_handoff",
  ),
  "pix-area-frontend": areaPromptText(
    "frontend",
    "pix_frontend_react, pix_frontend_vue, pix_frontend_svelte, pix_frontend_angular, pix_frontend_solidjs, pix_frontend_meta_astro, pix_frontend_meta_next, pix_frontend_meta_nuxt, pix_frontend_meta_remix, pix_frontend_vanilla_reactive, pix_frontend_design",
  ),
  "pix-area-backend": areaPromptText(
    "backend",
    "pix_backend_node, pix_backend_express, pix_backend_fastify, pix_backend_hono, pix_backend_nestjs, pix_backend_graphql, pix_backend_api_design, pix_backend_security",
  ),
  "pix-area-data": areaPromptText("data", "pix_data_postgresql, pix_data_mysql, pix_data_sqlite, pix_data_mongodb, pix_data_duckdb, pix_data_indexed_db, pix_data_sql"),
  "pix-area-toolchain": areaPromptText(
    "toolchain",
    "pix_toolchain_vite, pix_toolchain_pnpm, pix_toolchain_turborepo, pix_toolchain_rspack, pix_toolchain_parcel, pix_toolchain_typescript, pix_toolchain_eslint, pix_toolchain_biome, pix_toolchain_husky, pix_toolchain_commits, pix_toolchain_project",
  ),
  "pix-area-styleguide": areaPromptText(
    "styleguide",
    "pix_styleguide_a11y, pix_styleguide_css, pix_styleguide_html, pix_styleguide_javascript, pix_styleguide_json, pix_styleguide_markdown, pix_styleguide_naming, pix_styleguide_patterns, pix_styleguide_validation",
  ),
  "pix-area-process": areaPromptText(
    "process",
    "pix_process_code_review, pix_process_tdd, pix_process_feature_workflow, pix_process_documentation, pix_process_bmad, pix_tool_process_adr, pix_tool_process_handoff",
  ),
  "pix-area-devops": areaPromptText("devops", "pix_devops_docker, pix_devops_gitlab_ci, pix_devops_observability, pix_devops_testing, pix_devops_version"),
  "pix-area-platform": areaPromptText("platform", "pix_platform_web, pix_platform_desktop, pix_platform_expo, pix_platform_agent, pix_platform_library"),
  "pix-area-ai": areaPromptText("ai", "pix_ai_agents"),
  "pix-area-skills": areaPromptText("skills", "pix_find_skills"),
  "pix-area-ui": areaPromptText("ui", "pix_ui_design_system"),
};
