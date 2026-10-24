/** @module core/detector/rules.data - the framework, build-tool and skill tables */

/**
 * Framework detection rules: dependency name -> framework key.
 * Ordered by specificity (most specific first).
 */
export const FRAMEWORK_RULES = [
  { deps: ["@rule-mcp/rule-mcp-core"], key: "agents" },
  { deps: ["@angular/core"], key: "angular" },
  { deps: ["react", "react-dom"], key: "react" },
  { deps: ["vue"], key: "vue" },
  { deps: ["svelte"], key: "svelte" },
  { deps: ["solid-js"], key: "solid" },
  { deps: ["astro"], key: "astro" },
  { deps: ["electron"], key: "electron" },
];

/**
 * Build tool detection rules: devDependency name -> tool key.
 */
export const BUILD_TOOL_RULES = [
  { deps: ["vite"], key: "vite" },
  { deps: ["webpack", "webpack-cli"], key: "webpack" },
  { deps: ["esbuild"], key: "esbuild" },
  { deps: ["@angular/cli"], key: "angular-cli" },
  { deps: ["@sveltejs/kit", "svelte-kit"], key: "sveltekit" },
  { deps: ["next"], key: "next" },
  { deps: ["nuxt"], key: "nuxt" },
  { deps: ["parcel"], key: "parcel" },
  { deps: ["tsup"], key: "tsup" },
  { deps: ["tsc"], key: "tsc" },
];

/**
 * Framework key -> canonical thematic skill mapping.
 * Tool names are derived from the skill name by the same rule used by
 * registerSkillTool(): strip `rule-mcp-`, replace `-` with `_`, prefix `rule_tool_`.
 */
export const FRAMEWORK_SKILL_MAP = {
  agents: "rule-mcp-ai",
  angular: "rule-mcp-frontend-angular",
  astro: "rule-mcp-meta-astro",
  electron: "rule-mcp-platform-desktop",
  react: "rule-mcp-frontend-react",
  solid: "rule-mcp-frontend-solidjs",
  svelte: "rule-mcp-frontend-svelte",
  vue: "rule-mcp-frontend-vue",
};
