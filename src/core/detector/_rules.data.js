

/** @module core/detector/rules.data - the framework, build-tool and skill tables */

/**
 * Framework detection rules: dependency name -> framework key.
 * Ordered by specificity (most specific first).
 */
export const FRAMEWORK_RULES = [
  { deps: ["@rule/rule-mcp-core"], key: "agents" },
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
 * registerSkillTool(): strip `rule-`, replace `-` with `_`, prefix `pix_`.
 */
export const FRAMEWORK_SKILL_MAP = {
  agents: "rule-ai",
  angular: "rule-frontend-angular",
  astro: "rule-meta-astro",
  electron: "rule-platform-desktop",
  react: "rule-frontend-react",
  solid: "rule-frontend-solidjs",
  svelte: "rule-frontend-svelte",
  vue: "rule-frontend-vue",
};
